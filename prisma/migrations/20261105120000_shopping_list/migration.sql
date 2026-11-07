-- CreateTable
CREATE TABLE "shopping_list_items" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "addedById" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3),
    "checkedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopping_list_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_list_item_requests" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shopping_list_item_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shopping_list_items_householdId_checkedAt_idx" ON "shopping_list_items"("householdId", "checkedAt");

-- CreateIndex
CREATE INDEX "shopping_list_item_requests_itemId_idx" ON "shopping_list_item_requests"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "shopping_list_item_requests_householdId_clientId_key" ON "shopping_list_item_requests"("householdId", "clientId");

-- AddForeignKey
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_checkedById_fkey" FOREIGN KEY ("checkedById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list_item_requests" ADD CONSTRAINT "shopping_list_item_requests_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list_item_requests" ADD CONSTRAINT "shopping_list_item_requests_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "shopping_list_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

