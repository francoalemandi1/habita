export type PushPermissionStatus = "granted" | "denied" | "undetermined";

export interface PushPermissionSheetState {
  pendingTransferCount: number;
  permissionStatus: PushPermissionStatus;
  alreadyAsked: boolean;
}

/**
 * §7 "Permiso de push": ask with our own sheet the first time someone passes
 * a task, only while OS permission is undetermined and we haven't asked before.
 */
export function shouldShowPushPermissionSheet(state: PushPermissionSheetState): boolean {
  if (state.alreadyAsked) return false;
  if (state.permissionStatus !== "undetermined") return false;
  return state.pendingTransferCount >= 1;
}
