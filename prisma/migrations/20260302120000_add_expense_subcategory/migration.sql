-- CreateEnum
CREATE TYPE "ExpenseSubcategory" AS ENUM (
  'GENERAL',
  'SUPERMARKET',
  'KIOSCO',
  'DELIVERY',
  'RESTAURANT',
  'STREAMING',
  'PHARMACY',
  'FUEL',
  'TRANSPORT_APP'
);

-- AlterTable
ALTER TABLE "expenses"
ADD COLUMN "subcategory" "ExpenseSubcategory" NOT NULL DEFAULT 'GENERAL';

-- Backfill: delivery-like merchants and aliases
UPDATE "expenses"
SET "subcategory" = 'DELIVERY'
WHERE lower("title") LIKE '%rappi%'
   OR lower("title") LIKE '%pedidosya%'
   OR lower("title") LIKE '%pedidos ya%'
   OR lower("title") LIKE '%peya%'
   OR lower("title") LIKE '%delivery%'
   OR lower("title") LIKE '%ifood%'
   OR lower("title") LIKE '%didi food%'
   OR lower("title") LIKE '%glovo%';

-- Backfill: kiosco / convenience
UPDATE "expenses"
SET "subcategory" = 'KIOSCO'
WHERE "subcategory" = 'GENERAL'
  AND (
    lower("title") LIKE '%kiosco%'
    OR lower("title") LIKE '%kiosko%'
    OR lower("title") LIKE '%maxikiosco%'
    OR lower("title") LIKE '%minimarket%'
    OR lower("title") LIKE '%drugstore%'
  );

-- Backfill: supermarkets/chains/large groceries
UPDATE "expenses"
SET "subcategory" = 'SUPERMARKET'
WHERE "subcategory" = 'GENERAL'
  AND (
    lower("title") LIKE '%super%'
    OR lower("title") LIKE '%supermercado%'
    OR lower("title") LIKE '%coto%'
    OR lower("title") LIKE '%carrefour%'
    OR lower("title") LIKE '%jumbo%'
    OR lower("title") LIKE '%dia%'
    OR lower("title") LIKE '%disco%'
    OR lower("title") LIKE '%vea%'
    OR lower("title") LIKE '%changomas%'
  );
