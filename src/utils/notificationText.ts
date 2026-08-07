/**
 * Notification display helpers — mirror web notificationText.js behavior:
 * branch lives on a badge, not inside the message body.
 */

/** Drop leading `[Branch] ` from API/raw messages (legacy). */
export function stripBranchBracketPrefix(message: string | null | undefined): string {
  return String(message || '').replace(/^\[[^\]]+\]\s*/, '');
}
