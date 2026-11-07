import { redirect } from "next/navigation";

/** Top ofertas moved into Súper (handoff §5.3) — this route now just forwards there. */
export default function GroceryDealsPage(): never {
  redirect("/super?v=ofertas");
}
