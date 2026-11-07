import { describe, expect, it } from "vitest";
import { getMemberRoleLabel } from "../perfil-member-role";

describe("getMemberRoleLabel", () => {
  it("labels an ADULT member as Adulto", () => {
    expect(getMemberRoleLabel("ADULT")).toBe("Adulto");
  });

  it("labels a TEEN member as Adolescente", () => {
    expect(getMemberRoleLabel("TEEN")).toBe("Adolescente");
  });

  it("labels a CHILD member as Niño/a", () => {
    expect(getMemberRoleLabel("CHILD")).toBe("Niño/a");
  });
});
