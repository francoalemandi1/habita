import { describe, expect, it } from "vitest";
import {
  buildSettleRows,
  canRecordTransfer,
  joinNamesEs,
  lockedByLabel,
  settleButtonLabel,
  settleConsequenceLine,
} from "@/components/features/plata/settle/settle-logic";

const transfer = { fromMemberId: "sofi", fromMemberName: "Sofi", toMemberId: "tomi", toMemberName: "Tomi", amount: 100 };

describe("canRecordTransfer", () => {
  it("allows either party to record their own transfer", () => {
    expect(canRecordTransfer("sofi", "ADULT", transfer)).toBe(true);
    expect(canRecordTransfer("tomi", "TEEN", transfer)).toBe(true);
  });

  it("allows an ADULT not involved in the transfer", () => {
    expect(canRecordTransfer("vos", "ADULT", transfer)).toBe(true);
  });

  it("blocks a non-ADULT not involved in the transfer", () => {
    expect(canRecordTransfer("vos", "TEEN", transfer)).toBe(false);
    expect(canRecordTransfer("vos", "CHILD", transfer)).toBe(false);
  });
});

describe("buildSettleRows", () => {
  it("flattens every currency's transactions and tags recordability", () => {
    const rows = buildSettleRows({ ARS: { transactions: [transfer] } }, "sofi", "TEEN");
    expect(rows).toEqual([{ transaction: transfer, currency: "ARS", recordable: true }]);
  });
});

describe("settleButtonLabel", () => {
  it("uses the singular form for one payment", () => {
    expect(settleButtonLabel(1)).toBe("Registrar pago");
  });

  it("uses the plural form with a count for more than one", () => {
    expect(settleButtonLabel(3)).toBe("Registrar 3 pagos");
  });
});

describe("joinNamesEs", () => {
  it("joins two names with 'y'", () => {
    expect(joinNamesEs(["Sofi", "Tomi"])).toBe("Sofi y Tomi");
  });

  it("joins three or more names with commas and a trailing 'y'", () => {
    expect(joinNamesEs(["Sofi", "Tomi", "Lu"])).toBe("Sofi, Tomi y Lu");
  });

  it("de-duplicates repeated names", () => {
    expect(joinNamesEs(["Sofi", "Sofi"])).toBe("Sofi");
  });
});

describe("settleConsequenceLine", () => {
  it("names the other members involved in recordable transfers", () => {
    const rows = [{ transaction: transfer, currency: "ARS", recordable: true }];
    expect(settleConsequenceLine(rows, "vos")).toBe("Se les avisa a Sofi y Tomi");
  });

  it("uses singular phrasing for a single other member", () => {
    const soloTransfer = { ...transfer, fromMemberId: "vos", fromMemberName: "Vos" };
    const rows = [{ transaction: soloTransfer, currency: "ARS", recordable: true }];
    expect(settleConsequenceLine(rows, "vos")).toBe("Se le avisa a Tomi");
  });

  it("ignores non-recordable rows", () => {
    const rows = [{ transaction: transfer, currency: "ARS", recordable: false }];
    expect(settleConsequenceLine(rows, "vos")).toBe("");
  });
});

describe("lockedByLabel", () => {
  it("names both parties who can record the transfer", () => {
    expect(lockedByLabel(transfer)).toBe("Lo registra Sofi o Tomi");
  });
});
