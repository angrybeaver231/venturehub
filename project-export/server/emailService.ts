import { Resend } from 'resend';
import type { EmailRecipient } from './emailTemplates';

const DEFAULT_FROM_EMAIL = 'no-reply@ecfinuni.com';

async function getResendClient(): Promise<{ client: Resend; fromEmail: string }> {
  const directApiKey = process.env.RESEND_API_KEY;
  if (!directApiKey) {
    throw new Error('RESEND_API_KEY is not set');
  }
  return {
    client: new Resend(directApiKey),
    fromEmail: DEFAULT_FROM_EMAIL,
  };
}

const SENDER_DISPLAY_NAME = 'Предпринимательский Клуб ФУ';
const BULK_FROM = `${SENDER_DISPLAY_NAME} <events@ecfinuni.com>`;
const TRANSACTIONAL_FROM = `${SENDER_DISPLAY_NAME} <no-reply@ecfinuni.com>`;

export interface EmailOptions {
  to: string[];
  subject: string;
  html: string;
  text?: string;
  fromOverride?: string;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface PersonalizedEmailOptions {
  recipients: EmailRecipient[];
  subject: string;
  contentGenerator: (recipient: EmailRecipient) => { html: string; text: string };
  fromOverride?: string;
}

export interface EmailResult {
  successful: number;
  failed: number;
  failedEmails: string[];
}

export { BULK_FROM, TRANSACTIONAL_FROM };

const RATE_LIMIT_DELAY_MS = 600;
const RATE_LIMIT_RETRY_DELAY_MS = 3000;
const MAX_RETRIES = 3;
const BATCH_LOG_INTERVAL = 50;

async function sendWithRetry(
  client: Resend,
  payload: any,
  recipientEmail: string,
  maxRetries: number = MAX_RETRIES
): Promise<{ success: boolean; id?: string; error?: string }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await client.emails.send(payload);

      if (response.error) {
        const errorName = (response.error as any).name || 'unknown';
        const errorMessage = (response.error as any).message || JSON.stringify(response.error);

        if (errorName === 'rate_limit_exceeded' && attempt < maxRetries) {
          const backoff = RATE_LIMIT_RETRY_DELAY_MS * attempt;
          console.log(`[Resend] Rate limited for ${recipientEmail}, retrying in ${backoff}ms (attempt ${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, backoff));
          continue;
        }

        return { success: false, error: `${errorName} - ${errorMessage}` };
      }

      return { success: true, id: response.data?.id };
    } catch (error: any) {
      if (attempt < maxRetries) {
        const backoff = RATE_LIMIT_RETRY_DELAY_MS * attempt;
        console.log(`[Resend] Network error for ${recipientEmail}, retrying in ${backoff}ms (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }
      return { success: false, error: error.message || String(error) };
    }
  }
  return { success: false, error: 'Max retries exceeded' };
}

export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const results: EmailResult = {
    successful: 0,
    failed: 0,
    failedEmails: [],
  };

  const { client, fromEmail } = await getResendClient();
  const senderFrom = options.fromOverride || fromEmail;
  const total = options.to.length;

  console.log(`[Email] Starting send to ${total} recipient(s)...`);

  for (let i = 0; i < options.to.length; i++) {
    const recipient = options.to[i];

    const result = await sendWithRetry(client, {
      to: [recipient],
      from: senderFrom,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
    }, recipient);

    if (result.success) {
      results.successful++;
      console.log(`✓ [${results.successful + results.failed}/${total}] Sent to: ${recipient} (id: ${result.id})`);
    } else {
      results.failed++;
      results.failedEmails.push(recipient);
      console.error(`✗ [${results.successful + results.failed}/${total}] Failed ${recipient}: ${result.error}`);

      if (result.error?.includes('daily_quota_exceeded')) {
        console.error(`[Email] Daily quota exceeded — stopping. Sent ${results.successful}, remaining ${total - results.successful - results.failed} skipped.`);
        for (let j = i + 1; j < options.to.length; j++) {
          results.failed++;
          results.failedEmails.push(options.to[j]);
        }
        break;
      }
    }

    if (i < options.to.length - 1) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
    }

    if ((results.successful + results.failed) % BATCH_LOG_INTERVAL === 0) {
      console.log(`[Email] Progress: ${results.successful + results.failed}/${total} (${results.successful} sent, ${results.failed} failed)`);
    }
  }

  console.log(`[Email] Complete: ${results.successful} sent, ${results.failed} failed out of ${total}`);
  return results;
}

function isImageFile(filename: string, contentType?: string): boolean {
  if (contentType && contentType.startsWith('image/')) return true;
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  return imageExts.some(ext => filename.toLowerCase().endsWith(ext));
}

function getContentType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  const types: Record<string, string> = {
    'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
    'gif': 'image/gif', 'webp': 'image/webp', 'svg': 'image/svg+xml',
  };
  return types[ext || ''] || 'application/octet-stream';
}

export async function sendPersonalizedEmail(options: PersonalizedEmailOptions & { attachments?: EmailAttachment[] }): Promise<EmailResult> {
  const results: EmailResult = {
    successful: 0,
    failed: 0,
    failedEmails: [],
  };

  const { client, fromEmail } = await getResendClient();
  const senderFrom = options.fromOverride || fromEmail;

  const allAttachments = options.attachments || [];
  const imageAttachments = allAttachments.filter(a => isImageFile(a.filename, a.contentType));
  const nonImageFiles = allAttachments.filter(a => !isImageFile(a.filename, a.contentType));

  const { ObjectStorageService } = await import('./objectStorage');
  const objectStorageService = new ObjectStorageService();

  let imageGalleryHtml = '';
  const uploadedFileImages: string[] = [];
  for (const img of imageAttachments) {
    try {
      const uniqueFilename = `attach-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${img.filename}`;
      const buffer = Buffer.isBuffer(img.content) ? img.content : Buffer.from(img.content, 'base64');
      const imageUrl = await objectStorageService.uploadEmailImage(
        uniqueFilename,
        buffer,
        img.contentType || getContentType(img.filename),
      );
      uploadedFileImages.push(imageUrl);
      console.log(`[Email] Image uploaded to public storage: ${uniqueFilename}`);
    } catch (err: any) {
      console.error(`[Email] Failed to upload image ${img.filename}:`, err.message);
    }
  }

  if (uploadedFileImages.length > 0) {
    const imgTags = uploadedFileImages.map((url, i) =>
      `<img src="${url}" alt="image-${i + 1}" style="max-width: 100%; height: auto; display: block; margin: 12px 0; border-radius: 6px;" />`
    ).join('\n');
    imageGalleryHtml = `\n<div style="margin-top: 16px;">${imgTags}</div>`;
    console.log(`[Email] ${uploadedFileImages.length} image(s) uploaded to public storage for inline display`);
  }
  if (nonImageFiles.length > 0) {
    console.log(`[Email] ${nonImageFiles.length} non-image file(s) attached as downloads`);
  }

  const total = options.recipients.length;
  console.log(`[Email] Starting personalized send to ${total} recipient(s)...`);

  for (let i = 0; i < options.recipients.length; i++) {
    const recipient = options.recipients[i];
    try {
      const { html, text } = options.contentGenerator(recipient);

      let finalHtml = html;

      if (imageGalleryHtml) {
        if (finalHtml.includes('<!--ATTACHMENT_GALLERY-->')) {
          finalHtml = finalHtml.replace('<!--ATTACHMENT_GALLERY-->', imageGalleryHtml);
        } else {
          finalHtml = finalHtml.replace('</body>', `${imageGalleryHtml}</body>`);
        }
      }

      const emailPayload: any = {
        to: [recipient.email],
        from: senderFrom,
        subject: options.subject,
        html: finalHtml,
        text,
      };

      const resendAttachments: any[] = [];
      nonImageFiles.forEach(a => {
        resendAttachments.push({
          filename: a.filename,
          content: Buffer.isBuffer(a.content) ? a.content.toString('base64') : a.content,
        });
      });

      if (resendAttachments.length > 0) {
        emailPayload.attachments = resendAttachments;
      }

      const result = await sendWithRetry(client, emailPayload, recipient.email);

      if (result.success) {
        results.successful++;
        console.log(`✓ [${results.successful + results.failed}/${total}] Sent to: ${recipient.email} (id: ${result.id})`);
      } else {
        results.failed++;
        results.failedEmails.push(recipient.email);
        console.error(`✗ [${results.successful + results.failed}/${total}] Failed ${recipient.email}: ${result.error}`);

        if (result.error?.includes('daily_quota_exceeded')) {
          console.error(`[Email] Daily quota exceeded — stopping. Sent ${results.successful}, remaining ${total - results.successful - results.failed} skipped.`);
          for (let j = i + 1; j < options.recipients.length; j++) {
            results.failed++;
            results.failedEmails.push(options.recipients[j].email);
          }
          break;
        }
      }
    } catch (error: any) {
      results.failed++;
      results.failedEmails.push(recipient.email);
      console.error(`✗ [${results.successful + results.failed}/${total}] Failed ${recipient.email}: ${error.message || error}`);
    }

    if (i < options.recipients.length - 1) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
    }

    if ((results.successful + results.failed) % BATCH_LOG_INTERVAL === 0) {
      console.log(`[Email] Progress: ${results.successful + results.failed}/${total} (${results.successful} sent, ${results.failed} failed)`);
    }
  }

  console.log(`[Email] Complete: ${results.successful} sent, ${results.failed} failed out of ${total}`);
  return results;
}
