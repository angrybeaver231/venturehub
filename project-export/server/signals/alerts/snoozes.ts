// Group 8.3 — per-rule alert snoozes. In-memory only by design: snoozes are
// short-lived UX affordances ("mute this rule until tomorrow"), not durable
// policy. A process restart effectively unmutes all rules.

const snoozes = new Map<string, Date>();

export function muteRule(ruleId: string, until: Date): void {
  if (!ruleId) return;
  if (!(until instanceof Date) || Number.isNaN(until.getTime())) return;
  if (until.getTime() <= Date.now()) {
    snoozes.delete(ruleId);
    return;
  }
  snoozes.set(ruleId, until);
}

export function unmuteRule(ruleId: string): void {
  snoozes.delete(ruleId);
}

export function isRuleMuted(ruleId: string): boolean {
  const until = snoozes.get(ruleId);
  if (!until) return false;
  if (until.getTime() <= Date.now()) {
    snoozes.delete(ruleId);
    return false;
  }
  return true;
}

export function getMuteUntil(ruleId: string): Date | null {
  const until = snoozes.get(ruleId);
  if (!until) return null;
  if (until.getTime() <= Date.now()) {
    snoozes.delete(ruleId);
    return null;
  }
  return until;
}
