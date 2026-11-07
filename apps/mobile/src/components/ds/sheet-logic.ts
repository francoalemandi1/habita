const DISMISS_HEIGHT_FRACTION = 0.3;
const DISMISS_VELOCITY_THRESHOLD = 800;

/**
 * §6.14 Sheet: dragging past 30% of its height, or with enough velocity,
 * dismisses it even if the drag stops short of that distance.
 */
export function shouldDismissSheet(translationY: number, sheetHeight: number, velocityY: number): boolean {
  if (translationY <= 0 || sheetHeight <= 0) return false;
  const passedHeightThreshold = translationY / sheetHeight >= DISMISS_HEIGHT_FRACTION;
  const passedVelocityThreshold = velocityY >= DISMISS_VELOCITY_THRESHOLD;
  return passedHeightThreshold || passedVelocityThreshold;
}
