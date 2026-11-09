import { describe, expect, it } from "vitest";

import { isSafeCallbackPath } from "../safe-callback-path";

describe("isSafeCallbackPath", () => {
  it.each(["/casa", "/oauth/authorize?client_id=abc&redirect_uri=https%3A%2F%2Fclaude.ai%2Fcb", "/"])(
    "accepts the same-origin path %s",
    (path) => {
      expect(isSafeCallbackPath(path)).toBe(true);
    },
  );

  it.each(["//evil.example", "/\\evil.example", "https://evil.example", "evil", "", null, undefined])(
    "rejects %s",
    (path) => {
      expect(isSafeCallbackPath(path)).toBe(false);
    },
  );
});
