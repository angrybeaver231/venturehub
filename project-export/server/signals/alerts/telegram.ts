// Telegram delivery is a graceful no-op until Group 5 wires up the bot.
// When TELEGRAM_BOT_TOKEN is set we POST to the Bot API; otherwise we log
// and return false so the dispatcher records "not delivered" cleanly.

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

export async function sendTelegramMessage(chatId: string | number | null | undefined, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
    });
    if (!res.ok) {
      console.warn(`[alerts:telegram] failed (${res.status})`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[alerts:telegram]", err);
    return false;
  }
}
