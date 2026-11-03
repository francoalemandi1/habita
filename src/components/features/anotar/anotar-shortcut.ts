/** Elements where a bare "N" keystroke must type a letter instead of opening Anotar. */
const TYPING_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export interface AnotarKeydownEvent {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  /** POJO shape so this stays DOM-free and testable; callers map a real event's target to it. */
  target: { tagName?: string; isContentEditable?: boolean } | null;
}

function isTypingTarget(target: AnotarKeydownEvent["target"]): boolean {
  if (!target) return false;
  if (target.tagName && TYPING_TAGS.has(target.tagName)) return true;
  return target.isContentEditable === true;
}

/**
 * §6.15 — pressing "N" opens Anotar unless the user is typing. Pure so it can
 * be unit-tested without mounting a keydown listener.
 */
export function shouldOpenAnotarFromKeydown(event: AnotarKeydownEvent): boolean {
  if (event.key.toLowerCase() !== "n") return false;
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  return !isTypingTarget(event.target);
}
