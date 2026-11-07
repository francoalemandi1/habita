import { describe, expect, it } from "vitest";
import { shouldShowPushPermissionSheet } from "../avisos-push-sheet";

describe("shouldShowPushPermissionSheet", () => {
  it("shows the sheet on the first incoming pending transfer when undetermined", () => {
    const result = shouldShowPushPermissionSheet({
      pendingTransferCount: 1,
      permissionStatus: "undetermined",
      alreadyAsked: false,
    });

    expect(result).toBe(true);
  });

  it("never shows it again once already asked", () => {
    const result = shouldShowPushPermissionSheet({
      pendingTransferCount: 1,
      permissionStatus: "undetermined",
      alreadyAsked: true,
    });

    expect(result).toBe(false);
  });

  it("stays hidden when permission is already granted", () => {
    const result = shouldShowPushPermissionSheet({
      pendingTransferCount: 1,
      permissionStatus: "granted",
      alreadyAsked: false,
    });

    expect(result).toBe(false);
  });

  it("stays hidden when permission was denied", () => {
    const result = shouldShowPushPermissionSheet({
      pendingTransferCount: 1,
      permissionStatus: "denied",
      alreadyAsked: false,
    });

    expect(result).toBe(false);
  });

  it("stays hidden without a pending transfer", () => {
    const result = shouldShowPushPermissionSheet({
      pendingTransferCount: 0,
      permissionStatus: "undetermined",
      alreadyAsked: false,
    });

    expect(result).toBe(false);
  });
});
