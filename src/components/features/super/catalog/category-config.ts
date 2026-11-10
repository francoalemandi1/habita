import type { GroceryCategory } from "@prisma/client";

export const CATEGORY_LABELS: Record<GroceryCategory, string> = {
  ALMACEN: "Almacén",
  PANADERIA_DULCES: "Panadería y dulces",
  LACTEOS: "Lácteos",
  CARNES: "Carnes",
  FRUTAS_VERDURAS: "Frutas y verduras",
  BEBIDAS: "Bebidas",
  LIMPIEZA: "Limpieza",
  PERFUMERIA: "Perfumería",
};

export const CATEGORY_ORDER: GroceryCategory[] = [
  "ALMACEN",
  "PANADERIA_DULCES",
  "LACTEOS",
  "CARNES",
  "FRUTAS_VERDURAS",
  "BEBIDAS",
  "LIMPIEZA",
  "PERFUMERIA",
];
