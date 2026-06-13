import { storage } from "../../storage";
import { sendEmail } from "../../emailService";
import { sendTelegramMessage, isTelegramConfigured } from "./telegram";
import type { NotificationCategory, NotificationSeverity, NotificationType } from "@shared/schema";

export type AlertDelivery = {
  userIds: string[];
  type: NotificationType;
  severity: NotificationSeverity;
  category: NotificationCategory;
  title: string;
  content?: string;
  linkUrl?: string;
  relatedId?: string;
  channels: { inApp?: boolean; email?: boolean; telegram?: boolean; push?: boolean };
  pushPayload?: any;
};

// Centralized fan-out for the unified notification system. Records an in-app
// row, optionally emails via Resend, optionally pings Telegram (no-op without
// TELEGRAM_BOT_TOKEN), and stamps a push payload placeholder for the future
// mobile app. All channel failures are swallowed so one bad recipient never
// blocks the others.
export async function deliverAlert(d: AlertDelivery): Promise<void> {
  const channels = { inApp: true, ...d.channels };
  const uniqueUsers = Array.from(new Set(d.userIds.filter(Boolean)));

  for (const userId of uniqueUsers) {
    if (channels.inApp) {
      try {
        await storage.createNotification({
          userId,
          type: d.type,
          title: d.title,
          content: d.content ?? null,
          linkUrl: d.linkUrl ?? null,
          relatedId: d.relatedId ?? null,
          severity: d.severity,
          category: d.category,
          pushPayload: channels.push ? (d.pushPayload ?? { title: d.title, body: d.content }) : null,
        } as any);
      } catch (err) {
        console.warn("[alerts:inApp]", err);
      }
    }

    if (channels.email) {
      try {
        const user = await storage.getUser(userId);
        if (user?.email) {
          const subject = `[${d.severity.toUpperCase()}] ${d.title}`;
          const linkLine = d.linkUrl
            ? `<p><a href="${d.linkUrl}">Open in platform</a></p>`
            : "";
          const html = `
            <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; padding: 16px;">
              <h2 style="margin:0 0 8px 0;">${d.title}</h2>
              <p style="white-space:pre-wrap;">${(d.content ?? "").replace(/</g, "&lt;")}</p>
              ${linkLine}
              <hr/>
              <p style="color:#888;font-size:12px;">Business Club · Signals Alert</p>
            </div>`;
          const text = `${d.title}\n\n${d.content ?? ""}${d.linkUrl ? `\n\n${d.linkUrl}` : ""}`;
          await sendEmail({ to: [user.email], subject, html, text });
        }
      } catch (err) {
        console.warn("[alerts:email]", err);
      }
    }

    if (channels.telegram && isTelegramConfigured()) {
      // No telegram_chat_id field on users yet — a future Group 5 task will
      // populate this. For now we only attempt delivery if a chatId is
      // somehow present on the user record (forward-compat).
      const user = await storage.getUser(userId).catch(() => undefined);
      const chatId = (user as any)?.telegramChatId;
      if (chatId) {
        await sendTelegramMessage(chatId, `<b>${d.title}</b>\n${d.content ?? ""}`);
      }
    }
  }
}
