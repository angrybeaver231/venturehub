import sanitizeHtml from 'sanitize-html';
import crypto from 'crypto';

export interface EmailRecipient {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  patronymic?: string | null;
}

const UNSUBSCRIBE_SECRET = process.env.SESSION_SECRET || 'ventorix-unsubscribe-key-2024';

export function generateUnsubscribeToken(email: string): string {
  const hmac = crypto.createHmac('sha256', UNSUBSCRIBE_SECRET);
  hmac.update(email.toLowerCase());
  const signature = hmac.digest('hex');
  const payload = Buffer.from(JSON.stringify({ email: email.toLowerCase(), sig: signature })).toString('base64url');
  return payload;
}

export function verifyUnsubscribeToken(token: string): string | null {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
    const { email, sig } = decoded;
    if (!email || !sig) return null;
    const hmac = crypto.createHmac('sha256', UNSUBSCRIBE_SECRET);
    hmac.update(email.toLowerCase());
    const expectedSig = hmac.digest('hex');
    if (sig !== expectedSig) return null;
    return email;
  } catch {
    return null;
  }
}

export function getAppBaseUrl(): string {
  const customDomain = process.env.APP_BASE_URL;
  if (customDomain) return customDomain;
  const domain = process.env.APP_DOMAINS;
  if (domain) return `https://${domain}`;
  return 'https://ecfinuni.com';
}

function getUnsubscribeBlock(recipientEmail: string): string {
  const token = generateUnsubscribeToken(recipientEmail);
  const unsubscribeUrl = `${getAppBaseUrl()}/api/unsubscribe/${token}`;
  return `
              <p style="margin: 20px 0 0 0; padding-top: 16px; border-top: 1px solid #eeeeee; font-size: 11px; color: #bbbbbb; text-align: center;">
                Если вы не хотите получать наши рассылки, <a href="${unsubscribeUrl}" style="color: #999999; text-decoration: underline;">нажмите сюда, чтобы отказаться от рассылки</a>.
              </p>`;
}

export function sanitizeEmailContent(htmlContent: string): string {
  return sanitizeHtml(htmlContent, {
    allowedTags: [
      'p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'a', 'span', 'div', 'img'
    ],
    allowedAttributes: {
      'a': ['href', 'target', 'rel'],
      'span': ['style'],
      'p': ['style'],
      'div': ['style'],
      'img': ['src', 'alt', 'width', 'height', 'style']
    },
    allowedStyles: {
      '*': {
        'color': [/^#(0x)?[0-9a-f]+$/i, /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/],
        'background-color': [/^#(0x)?[0-9a-f]+$/i, /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/],
        'text-align': [/^left$/, /^right$/, /^center$/],
        'max-width': [/^\d+(%|px|em|rem)$/],
        'width': [/^\d+(%|px|em|rem)$/],
        'height': [/^auto$/, /^\d+(%|px|em|rem)$/],
      }
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      'a': (tagName, attribs) => {
        return {
          tagName: 'a',
          attribs: {
            ...attribs,
            rel: 'noopener noreferrer',
            target: '_blank'
          }
        };
      },
      'img': (tagName, attribs) => {
        const existingStyle = attribs.style || '';
        const hasMaxWidth = /max-width/i.test(existingStyle);
        const imgStyle = hasMaxWidth
          ? existingStyle
          : (existingStyle ? existingStyle.replace(/;?\s*$/, '; max-width: 100%; height: auto;') : 'max-width: 100%; height: auto;');
        return {
          tagName: 'img',
          attribs: {
            ...attribs,
            style: imgStyle
          }
        };
      }
    },
    parser: {
      lowerCaseTags: true
    }
  });
}

function isRichHtml(content: string): boolean {
  const htmlTagPattern = /<(p|div|h[1-6]|ul|ol|li|strong|em|u|s|br|img|a)\b[^>]*>/i;
  return htmlTagPattern.test(content);
}

function htmlToPlainText(html: string): string {
  let text = html;
  
  text = text.replace(/<(p|div|h[1-6]|li|tr)[^>]*>/gi, '\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<\/(p|div|h[1-6]|tr)>/gi, '\n');
  
  text = text.replace(/<[^>]*>/g, '');
  
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  
  text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
  text = text.trim();
  
  return text;
}

const MAX_EMAIL_CONTENT_LENGTH = 500000;
const MAX_EMAIL_CONTENT_LENGTH_AFTER_EXTRACTION = 200000;

function isContentEmpty(content: string): boolean {
  if (!content || content.trim().length === 0) {
    return true;
  }
  
  const textOnly = content
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, '')
    .trim();
  
  return textOnly.length === 0;
}

export function validateEmailContent(content: string): { valid: boolean; error?: string } {
  if (isContentEmpty(content)) {
    return { valid: false, error: 'Email content cannot be empty' };
  }
  
  if (content.length > MAX_EMAIL_CONTENT_LENGTH) {
    return { valid: false, error: `Email content is too long. Maximum ${MAX_EMAIL_CONTENT_LENGTH} characters allowed.` };
  }
  
  return { valid: true };
}

export interface ExtractedImage {
  id: string;
  filename: string;
  buffer: Buffer;
  contentType: string;
}

export function extractBase64Images(html: string): { cleanedHtml: string; extractedImages: ExtractedImage[] } {
  const extractedImages: ExtractedImage[] = [];
  let counter = 0;
  
  const cleanedHtml = html.replace(
    /src=["']data:(image\/(png|jpeg|jpg|gif|webp|svg\+xml));base64,([^"']+)["']/gi,
    (_match, fullMime, ext, base64Data) => {
      counter++;
      const id = `email-img-${Date.now()}-${counter}`;
      const normalizedExt = ext === 'svg+xml' ? 'svg' : (ext === 'jpg' ? 'jpeg' : ext);
      const filename = `${id}.${normalizedExt}`;
      
      extractedImages.push({
        id,
        filename,
        buffer: Buffer.from(base64Data, 'base64'),
        contentType: fullMime,
      });
      
      return `src="__EMAIL_IMAGE_PLACEHOLDER_${counter - 1}__"`;
    }
  );
  
  return { cleanedHtml, extractedImages };
}

function inferGenderFromPatronymic(patronymic: string): 'male' | 'female' | 'unknown' {
  if (!patronymic) return 'unknown';
  
  const lowerPatronymic = patronymic.toLowerCase().trim();
  
  if (lowerPatronymic.endsWith('овна') || lowerPatronymic.endsWith('евна') || lowerPatronymic.endsWith('ична')) {
    return 'female';
  }
  
  if (lowerPatronymic.endsWith('ович') || lowerPatronymic.endsWith('евич') || lowerPatronymic.endsWith('ич')) {
    return 'male';
  }
  
  return 'unknown';
}

export function getPersonalizedGreeting(recipient: EmailRecipient): string {
  const firstName = recipient.firstName || '';
  const patronymic = recipient.patronymic || '';
  
  if (!firstName) {
    return 'Здравствуйте!';
  }
  
  const gender = inferGenderFromPatronymic(patronymic);
  
  if (firstName && patronymic && gender !== 'unknown') {
    const respectfulAddress = gender === 'female' ? 'Уважаемая' : 'Уважаемый';
    return `${respectfulAddress} ${firstName} ${patronymic}!`;
  } else if (firstName && gender !== 'unknown') {
    const respectfulAddress = gender === 'female' ? 'Уважаемая' : 'Уважаемый';
    return `${respectfulAddress} ${firstName}!`;
  } else {
    return 'Здравствуйте!';
  }
}

export function createPlainTextEmail(params: {
  greeting: string;
  content: string;
}): string {
  const { greeting, content } = params;
  
  return `${greeting}

${content}

С уважением,
Предпринимательский Клуб ФУ`;
}

export function createSystemEmailHtml(params: {
  greeting: string;
  content: string;
}): string {
  const { greeting, content } = params;
  const escapedContent = content.replace(/\n/g, '<br/>');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin: 0; padding: 0; font-family: Segoe UI, Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding: 30px 20px;">
        <table role="presentation" width="600" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 32px 32px; font-size: 14px; line-height: 1.6; color: #333333;">
              <p style="margin: 0 0 16px 0;">${greeting}</p>
              <div style="margin-bottom: 24px;">
                ${escapedContent}
              </div>
              <p style="margin: 0;">С уважением,</p>
              <p style="margin: 0; color: #555555;">Предпринимательский Клуб ФУ</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function createPasswordResetEmail(recipient: EmailRecipient, code: string): { html: string; text: string } {
  const greeting = getPersonalizedGreeting(recipient);
  const content = `Мы получили запрос на сброс пароля для вашей учетной записи Предпринимательского Клуба.

Ваш код для сброса пароля: <strong>${code}</strong>

Код действителен в течение 1 часа.

Вводите этот код только на официальном сайте платформы. Не делитесь им ни с кем. Мы не будем запрашивать его за пределами официальной платформы.`;

  const textContent = `Мы получили запрос на сброс пароля для вашей учетной записи Предпринимательского Клуба.\n\nВаш код для сброса пароля: ${code}\n\nКод действителен в течение 1 часа.\n\nВводите этот код только на официальном сайте платформы. Не делитесь им ни с кем. Мы не будем запрашивать его за пределами официальной платформы.`;

  return {
    html: createSystemEmailHtml({ greeting, content }),
    text: createPlainTextEmail({ greeting, content: textContent }),
  };
}

export function createEmailVerificationEmail(recipient: EmailRecipient, code: string): { html: string; text: string } {
  const greeting = getPersonalizedGreeting(recipient);
  const content = `Для завершения регистрации на платформе Предпринимательского Клуба, пожалуйста, подтвердите ваш адрес электронной почты.

Ваш код подтверждения: <strong>${code}</strong>

Код действителен в течение 15 минут.

Вводите этот код только на официальном сайте платформы. Не делитесь им ни с кем.`;

  const textContent = `Для завершения регистрации на платформе Предпринимательского Клуба, пожалуйста, подтвердите ваш адрес электронной почты.\n\nВаш код подтверждения: ${code}\n\nКод действителен в течение 15 минут.\n\nВводите этот код только на официальном сайте платформы. Не делитесь им ни с кем.`;

  return {
    html: createSystemEmailHtml({ greeting, content }),
    text: createPlainTextEmail({ greeting, content: textContent }),
  };
}

export function createBulkEmail(recipient: EmailRecipient, messageContent: string): { html: string; text: string } {
  const sanitizedContent = sanitizeEmailContent(messageContent);
  
  if (isContentEmpty(sanitizedContent)) {
    throw new Error('Email content cannot be empty');
  }
  
  const isHtml = isRichHtml(sanitizedContent);
  
  const htmlContent = isHtml 
    ? sanitizedContent 
    : sanitizedContent.replace(/\n/g, '<br/>');
  
  const textContent = isHtml
    ? htmlToPlainText(sanitizedContent)
    : sanitizedContent;

  const unsubscribeToken = generateUnsubscribeToken(recipient.email);
  const unsubscribeUrl = `${getAppBaseUrl()}/api/unsubscribe/${unsubscribeToken}`;
  const plainTextUnsubscribe = `\n\n---\nЕсли вы не хотите получать наши рассылки, перейдите по ссылке: ${unsubscribeUrl}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin: 0; padding: 0; font-family: Segoe UI, Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding: 30px 20px;">
        <table role="presentation" width="600" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 32px 32px; font-size: 14px; line-height: 1.6; color: #333333;">
              ${htmlContent}
              <!--ATTACHMENT_GALLERY-->
              ${getUnsubscribeBlock(recipient.email)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
  
  return {
    html,
    text: textContent + plainTextUnsubscribe,
  };
}
