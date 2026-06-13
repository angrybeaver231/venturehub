/**
 * Stub for tg-community-watcher. The full implementation requires:
 *   - A dedicated MTProto user-account (~$30–50/mo VPS for stability)
 *   - Telegram API credentials (api_id / api_hash from my.telegram.org)
 *   - A whitelist of public chats (`scout_source_whitelist`)
 *
 * Until those credentials exist this collector logs a no-op and returns 0.
 * The framework around it (recordObservation, classifier, clustering) is
 * already proven by `inbound-internal`, so dropping in MTProto later is a
 * matter of writing the message handler.
 */
export async function runTgCommunityWatcher(): Promise<{ observations: number }> {
  if (!process.env.TG_MTPROTO_API_ID || !process.env.TG_MTPROTO_API_HASH) {
    return { observations: 0 };
  }
  // TODO: connect MTProto, subscribe to whitelisted chats, fan messages into
  // recordObservation({ collector: "tg-community-watcher", ... }).
  return { observations: 0 };
}
