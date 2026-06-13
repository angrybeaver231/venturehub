import { SignalIngestor } from "../base";
import { getTelegramBotToken, runTelegramDailyAggregator } from "../../telegram";
import { MissingCredentialError } from "../credentials";

/**
 * Telegram Workspace Bot ingestor (Group 5 / Task #24).
 *
 * Most events are emitted in real time by the `/api/telegram/webhook` route
 * (linked-chat, founder reactions, founder forwards). This ingestor only owns
 * the periodic per-chat-per-day team_chat_health rollup; it can also be
 * pinged from the admin signals UI to trigger an immediate aggregation.
 */
export class TelegramWorkspaceSource extends SignalIngestor {
  readonly sourceKey = "telegram-workspace";
  readonly displayName = "Telegram workspace bot";
  // Marked internal so the every-15-min `light-ingest-15m` cron job skips it.
  // The dedicated `telegram-daily-aggregate` cron job (and the manual "Run now"
  // action in the admin signals UI) is the only thing that should drive this
  // source.
  readonly category = "internal";
  readonly description =
    "Single platform Telegram bot. Counts metadata, captures 🚀/#vmu reactions as milestones, and turns founder forwards into timeline events.";
  readonly requiresCredentials = true;
  readonly credentialKind = "telegram-bot-token";

  protected async execute(): Promise<number> {
    if (!getTelegramBotToken()) {
      throw new MissingCredentialError("TELEGRAM_BOT_TOKEN");
    }
    return await runTelegramDailyAggregator();
  }
}
