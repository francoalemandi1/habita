export type SwipeAction = "none" | "done" | "pass" | "delete";

const DONE_WIDTH = 96;
const PASS_WIDTH = 76;
const DELETE_WIDTH = 76;
const RIGHT_COMMIT_FRACTION = 0.4;
const LEFT_COMMIT_FRACTION = 0.4;

export const SWIPE_WIDTHS = {
  done: DONE_WIDTH,
  pass: PASS_WIDTH,
  delete: DELETE_WIDTH,
  left: PASS_WIDTH + DELETE_WIDTH,
} as const;

/**
 * §6.12 SwipeRow: right swipe reveals "Hecha" (96 wide) and fires on release
 * past 40% of that width; left swipe reveals "Pasar" + "Borrar" (76 each),
 * each committing once its own 40% threshold is crossed.
 */
export function resolveSwipeAction(translationX: number): SwipeAction {
  if (translationX >= DONE_WIDTH * RIGHT_COMMIT_FRACTION) return "done";
  if (translationX <= -(PASS_WIDTH * LEFT_COMMIT_FRACTION)) {
    const leftDistance = -translationX;
    if (leftDistance >= PASS_WIDTH + DELETE_WIDTH * LEFT_COMMIT_FRACTION) return "delete";
    return "pass";
  }
  return "none";
}
