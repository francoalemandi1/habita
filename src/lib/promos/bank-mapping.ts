/**
 * Bank slug → display name mapping for promoarg.com bank IDs.
 */

const BANK_DISPLAY_NAMES: Record<string, string> = {
  // Billeteras virtuales
  mercadopago: "Mercado Pago",
  cuentadni: "Cuenta DNI",
  modo: "MODO",
  naranjax: "Naranja X",
  personalpay: "Personal Pay",
  uala: "Ualá",
  reba: "Reba",
  // Bancos tradicionales
  galicia: "Galicia",
  santander: "Santander",
  bbva: "BBVA",
  macro: "Macro",
  nacion: "Nación",
  icbc: "ICBC",
  supervielle: "Supervielle",
  credicoop: "Credicoop",
  patagonia: "Patagonia",
  ciudad: "Ciudad",
  bancor: "Bancor",
  brubank: "Brubank",
  hipotecario: "Hipotecario",
  comafi: "Comafi",
  bancodelsol: "Banco del Sol",
  btf: "Tierra del Fuego",
  hsbc: "HSBC",
  provincia: "Provincia",
  // Otros
  clublanacion: "Club La Nación",
  clarin365: "Clarín 365",
  shell_box: "Shell Box",
  axion_on: "Axion ON",
  ypf_serviclub: "YPF Serviclub",
};

/** Resolve a promoarg bank slug to a human-readable name. */
export function getBankDisplayName(bankSlug: string): string {
  return BANK_DISPLAY_NAMES[bankSlug] ?? capitalize(bankSlug);
}

function capitalize(slug: string): string {
  return slug
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
