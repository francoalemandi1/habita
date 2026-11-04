import { describe, expect, it } from "vitest";
import {
  buildSettleRows,
  canRecordTransfer,
  joinNamesEs,
  lockedByLabel,
  settleButtonLabel,
  settleConsequenceLine,
} from "./plata-money-settle";

const transaction = {
  fromMemberId: "sofi",
  fromMemberName: "Sofi",
  toMemberId: "tomi",
  toMemberName: "Tomi",
  amount: 100,
};

describe("canRecordTransfer", () => {
  it("allows an ADULT to record any transfer", () => {
    expect(canRecordTransfer("me", "ADULT", transaction)).toBe(true);
  });

  it("allows a party to the transfer to record it", () => {
    expect(canRecordTransfer("sofi", "TEEN", transaction)).toBe(true);
  });

  it("blocks a non-party non-ADULT member", () => {
    expect(canRecordTransfer("me", "TEEN", transaction)).toBe(false);
  });
});

describe("buildSettleRows", () => {
  it("flattens every currency's transactions and tags recordable rows", () => {
    const rows = buildSettleRows({ ARS: { transactions: [transaction] } }, "sofi", "TEEN");
    expect(rows).toEqual([{ transaction, currency: "ARS", recordable: true }]);
  });
});

describe("settleButtonLabel", () => {
  it("uses singular for one payment", () => {
    expect(settleButtonLabel(1)).toBe("Registrar pago");
  });

  it("uses plural with the count otherwise", () => {
    expect(settleButtonLabel(3)).toBe("Registrar 3 pagos");
  });
});

describe("joinNamesEs", () => {
  it("joins with y for two or more names", () => {
    expect(joinNamesEs(["Sofi"])).toBe("Sofi");
    expect(joinNamesEs(["Sofi", "Tomi"])).toBe("Sofi y Tomi");
    expect(joinNamesEs(["Sofi", "Tomi", "Lu"])).toBe("Sofi, Tomi y Lu");
  });

  it("dedupes repeated names", () => {
    expect(joinNamesEs(["Sofi", "Sofi"])).toBe("Sofi");
  });
});

describe("settleConsequenceLine", () => {
  it("names the other members on recordable rows", () => {
    const rows = [{ transaction, currency: "ARS", recordable: true }];
    expect(settleConsequenceLine(rows, "me")).toBe("Se les avisa a Sofi y Tomi");
  });

  it("is empty when no recordable rows involve others", () => {
    expect(settleConsequenceLine([], "me")).toBe("");
  });
});

describe("lockedByLabel", () => {
  it("names both parties who can record it instead", () => {
    expect(lockedByLabel(transaction)).toBe("Lo registra Sofi o Tomi");
  });
});
