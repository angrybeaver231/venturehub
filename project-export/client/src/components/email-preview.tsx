import { useMemo } from 'react';
import { Eye, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AttachedFile } from '@/components/ui/rich-text-editor';

interface EmailPreviewProps {
  htmlContent: string;
  subject?: string;
  attachments?: AttachedFile[];
}

function sanitizeForPreview(html: string): string {
  const allowedTags = new Set([
    'p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'a', 'span', 'div', 'img',
  ]);

  let result = html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/gi, (match, tagName) => {
    const lower = tagName.toLowerCase();
    if (!allowedTags.has(lower)) return '';
    return match;
  });

  result = result.replace(/<img\b([^>]*)>/gi, (match, attrs) => {
    if (/max-width/i.test(attrs)) return match;
    if (/style\s*=/i.test(attrs)) {
      return match.replace(/style\s*=\s*"([^"]*)"/i, (_, s) => `style="${s}; max-width: 100%; height: auto;"`);
    }
    return `<img style="max-width: 100%; height: auto;" ${attrs}>`;
  });

  return result;
}

function isImageFile(name: string): boolean {
  return /\.(jpe?g|png|gif|webp|svg|bmp|ico)$/i.test(name);
}

export function EmailPreviewToggle({ 
  mode, 
  onToggleMode 
}: { 
  mode: 'compose' | 'preview'; 
  onToggleMode: (mode: 'compose' | 'preview') => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-md border p-0.5" data-testid="email-mode-toggle">
      <Button
        type="button"
        variant={mode === 'compose' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onToggleMode('compose')}
        data-testid="button-compose-mode"
      >
        <Pencil className="w-3.5 h-3.5 mr-1.5" />
        Редактор
      </Button>
      <Button
        type="button"
        variant={mode === 'preview' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onToggleMode('preview')}
        data-testid="button-preview-mode"
      >
        <Eye className="w-3.5 h-3.5 mr-1.5" />
        Предпросмотр
      </Button>
    </div>
  );
}

export function EmailPreview({ htmlContent, subject, attachments = [] }: EmailPreviewProps) {
  const isContentEmpty = !htmlContent || 
    htmlContent.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length === 0;

  const imageAttachments = attachments.filter(a => isImageFile(a.file.name));

  const attachmentPreviewUrls = useMemo(() => {
    return imageAttachments.map(a => ({
      name: a.file.name,
      url: URL.createObjectURL(a.file),
    }));
  }, [imageAttachments.map(a => a.id).join(',')]);

  const sanitizedContent = isContentEmpty ? '' : sanitizeForPreview(htmlContent);

  let attachmentGalleryHtml = '';
  if (attachmentPreviewUrls.length > 0) {
    const imgTags = attachmentPreviewUrls.map((img, i) =>
      `<img src="${img.url}" alt="${img.name}" style="max-width: 100%; height: auto; display: block; margin: 12px 0; border-radius: 6px;" />`
    ).join('\n');
    attachmentGalleryHtml = `<div style="margin-top: 16px;">${imgTags}</div>`;
  }

  const bodyContent = isContentEmpty
    ? '<p style="color: #999999; font-style: italic;">Начните писать, чтобы увидеть предпросмотр...</p>'
    : sanitizedContent;

  const previewHtml = `
    <div style="margin: 0; padding: 0; font-family: Segoe UI, Arial, sans-serif; background-color: #f5f5f5;">
      <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding: 30px 20px;">
            <table role="presentation" width="600" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
              <tr>
                <td style="padding: 32px 32px; font-size: 14px; line-height: 1.6; color: #333333;">
                  ${bodyContent}
                  ${attachmentGalleryHtml}
                  <p style="margin: 20px 0 0 0; padding-top: 16px; border-top: 1px solid #eeeeee; font-size: 11px; color: #bbbbbb; text-align: center;">
                    Если вы не хотите получать наши рассылки, <span style="color: #999999; text-decoration: underline;">нажмите сюда, чтобы отказаться от рассылки</span>.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  return (
    <div className="space-y-3" data-testid="email-preview-container">
      {subject && (
        <div className="rounded-md border px-4 py-2.5">
          <span className="text-xs text-muted-foreground mr-2">Тема:</span>
          <span className="text-sm font-medium">{subject}</span>
        </div>
      )}
      <div 
        className="rounded-md border overflow-hidden"
        style={{ maxHeight: '60vh', overflowY: 'auto' }}
      >
        <div 
          dangerouslySetInnerHTML={{ __html: previewHtml }}
          data-testid="email-preview-rendered"
        />
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Так получатели увидят ваше письмо в почтовом клиенте
      </p>
    </div>
  );
}
