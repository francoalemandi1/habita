import { describe, expect, it } from "vitest";

import { buildSettlementNotices } from "../settlement-notifications";

const vosPaysTomi = {
  fromMemberId: "vos",
  toMemberId: "tomi",
  amount: 16107,
  currency: "ARS",
  fromMember: { name: "Vos" },
  toMember: { name: "Tomi" },
};

describe("buildSettlementNotices", () => {
  it("notifies only the receiver when the payer records it", () => {
    const notices = buildSettlementNotices([vosPaysTomi], { id: "vos", name: "Vos" });
    expect(notices).toEqual([{ memberId: "tomi", message: "Vos te pagó $16.107" }]);
  });

  it("notifies both parties when a third adult records it", () => {
    const notices = buildSettlementNotices([vosPaysTomi], { id: "sofi", name: "Sofi" });
    expect(notices.map((notice) => notice.memberId)).toEqual(["tomi", "vos"]);
  });

  it("names a non-ARS currency explicitly", () => {
    const notices = buildSettlementNotices([{ ...vosPaysTomi, amount: 30, currency: "USD" }], { id: "vos", name: "Vos" });
    expect(notices[0]?.message).toBe("Vos te pagó USD 30");
  });
});
