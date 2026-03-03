import { useCallback, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronDown,
  ChevronUp,
  CreditCard,
  ExternalLink,
  Minus,
  Plus,
  RefreshCw,
  ShoppingCart,
  Trash2,
  Trophy,
  XCircle,
} from "lucide-react-native";
import { useDeleteSavedCart, useRefreshSavedCart, useSaveCart, useSavedCarts } from "@/hooks/use-saved-carts";
import { useShoppingAlternatives, useShoppingPlan } from "@/hooks/use-shopping-plan";
import { usePromos, parseJsonArray } from "@/hooks/use-promos";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StyledTextInput } from "@/components/ui/text-input";
import { ScreenHeader } from "@/components/features/screen-header";
import { colors, fontFamily, radius, spacing, storeColorFallback, storeColors, typography } from "@/theme";

import type {
  AlternativeProduct,
  SavedCart,
  SaveCartInput,
  SearchItem,
  StoreCart,
} from "@habita/contracts";
import type { BankPromo } from "@/hooks/use-promos";

function formatAmount(amount: number): string {
  return `$${amount.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

interface ProductOverride {
  isAdded: boolean;
  isOutOfStock: boolean;
  replacement: AlternativeProduct | null;
}

type StoreCartProduct = StoreCart["products"][number];

interface AdjustedProduct extends StoreCartProduct {
  isAdded: boolean;
  isOutOfStock: boolean;
}

interface AdjustedStoreCart extends Omit<StoreCart, "products" | "totalPrice" | "cheapestCount"> {
  products: AdjustedProduct[];
  totalPrice: number;
  cheapestCount: number;
}

function overrideKey(storeName: string, searchTerm: string): string {
  return `${storeName}::${searchTerm}`;
}

function toRecordArray(products: AdjustedProduct[]): Array<Record<string, unknown>> {
  return products.map((product) => ({ ...product })) as Array<Record<string, unknown>>;
}

function getStoreColor(storeName: string): { bg: string; text: string } {
  const key = storeName.toLowerCase();
  for (const [name, color] of Object.entries(storeColors)) {
    if (key.includes(name.toLowerCase())) {
      return color;
    }
  }
  return storeColorFallback;
}

const STORE_DOMAINS: Record<string, string> = {
  Carrefour: "www.carrefour.com.ar",
  Coto: "www.cotodigital.com.ar",
  Dia: "diaonline.supermercadosdia.com.ar",
  Disco: "www.disco.com.ar",
  Jumbo: "www.jumbo.com.ar",
  "Mas Online": "www.masonline.com.ar",
  Vea: "www.vea.com.ar",
  HiperLibertad: "www.hiperlibertad.com.ar",
  Cordiez: "www.cordiez.com.ar",
  Toledo: "www.toledodigital.com.ar",
  "Coop. Obrera": "www.lacoopeencasa.coop",
};

function getStoreFaviconUrl(storeName: string): string | null {
  const domain = STORE_DOMAINS[storeName];
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

interface StoreAvatarProps {
  storeName: string;
  size?: number;
}

function StoreAvatar({ storeName, size = 40 }: StoreAvatarProps) {
  const color = getStoreColor(storeName);
  const [faviconError, setFaviconError] = useState(false);
  const faviconUrl = getStoreFaviconUrl(storeName);

  return (
    <View
      style={[
        styles.storeAvatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color.bg },
      ]}
    >
      {faviconUrl && !faviconError ? (
        <Image
          source={{ uri: faviconUrl }}
          style={{ width: size * 0.6, height: size * 0.6, borderRadius: 4 }}
          onError={() => setFaviconError(true)}
        />
      ) : (
        <Text style={[styles.storeAvatarText, { color: color.text, fontSize: size * 0.4 }]}>
          {storeName.slice(0, 2).toUpperCase()}
        </Text>
      )}
    </View>
  );
}

interface ProductChipProps {
  item: SearchItem;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}

function ProductChip({ item, onIncrement, onDecrement, onRemove }: ProductChipProps) {
  return (
    <View style={styles.productChip}>
      <View style={styles.productChipLeft}>
        <ShoppingCart size={14} color={colors.primary} />
        <Text style={styles.productChipTerm} numberOfLines={1}>{item.term}</Text>
      </View>
      <View style={styles.productChipActions}>
        <Pressable onPress={onDecrement} style={styles.chipQtyBtn} hitSlop={6}>
          <Minus size={12} color={colors.text} />
        </Pressable>
        <Text style={styles.productChipQty}>{item.quantity}</Text>
        <Pressable onPress={onIncrement} style={styles.chipQtyBtn} hitSlop={6}>
          <Plus size={12} color={colors.text} />
        </Pressable>
        <Pressable onPress={onRemove} style={styles.chipRemoveBtn} hitSlop={6}>
          <Trash2 size={12} color={colors.destructive} />
        </Pressable>
      </View>
    </View>
  );
}

function fromSavedCart(savedCart: SavedCart): AdjustedStoreCart {
  const rawProducts = Array.isArray(savedCart.products) ? savedCart.products : [];
  const products: AdjustedProduct[] = rawProducts.map((rawProduct, index) => {
    const searchTerm =
      typeof rawProduct.searchTerm === "string" && rawProduct.searchTerm.length > 0
        ? rawProduct.searchTerm
        : `producto-${index + 1}`;
    const quantity = typeof rawProduct.quantity === "number" ? Math.max(1, rawProduct.quantity) : 1;
    const price = typeof rawProduct.price === "number" ? rawProduct.price : 0;
    const lineTotal = typeof rawProduct.lineTotal === "number" ? rawProduct.lineTotal : price * quantity;
    return {
      searchTerm,
      quantity,
      productName: typeof rawProduct.productName === "string" ? rawProduct.productName : searchTerm,
      price,
      lineTotal,
      listPrice: typeof rawProduct.listPrice === "number" ? rawProduct.listPrice : null,
      imageUrl: typeof rawProduct.imageUrl === "string" ? rawProduct.imageUrl : null,
      link: typeof rawProduct.link === "string" ? rawProduct.link : "",
      isCheapest: Boolean(rawProduct.isCheapest),
      unitInfo: (rawProduct.unitInfo as StoreCart["products"][number]["unitInfo"]) ?? null,
      alternatives: Array.isArray(rawProduct.alternatives)
        ? (rawProduct.alternatives as AlternativeProduct[])
        : [],
      averagePrice: typeof rawProduct.averagePrice === "number" ? rawProduct.averagePrice : null,
      isAdded: Boolean(rawProduct.isAdded),
      isOutOfStock: Boolean(rawProduct.isOutOfStock),
    };
  });

  const activeProducts = products.filter((product) => !product.isOutOfStock);
  return {
    storeName: savedCart.storeName,
    products,
    totalPrice: activeProducts.reduce((sum, product) => sum + product.lineTotal, 0),
    cheapestCount: activeProducts.filter((product) => product.isCheapest).length,
    missingTerms: savedCart.missingTerms,
    totalSearched: savedCart.totalSearched,
  };
}

interface ProductRowProps {
  product: AdjustedProduct;
  storeName: string;
  overrides: Map<string, ProductOverride>;
  replaceKey: string | null;
  replaceQuery: string;
  replaceOptions: Record<string, AlternativeProduct[]>;
  alternativesIsPending: boolean;
  alternativesVariables: { storeName: string; searchTerm: string } | null;
  recommendation: { storeName: string; lineTotal: number } | undefined;
  onUpdateQuantity: (term: string, delta: number) => void;
  onSetOverride: (storeName: string, searchTerm: string, update: Partial<ProductOverride>) => void;
  onToggleReplace: (key: string, searchTerm: string) => void;
  onReplaceQueryChange: (query: string) => void;
  onRunAlternatives: (storeName: string, searchTerm: string, query: string) => void;
}

function ProductRow({
  product,
  storeName,
  replaceKey,
  replaceQuery,
  replaceOptions,
  alternativesIsPending,
  alternativesVariables,
  recommendation,
  onUpdateQuantity,
  onSetOverride,
  onToggleReplace,
  onReplaceQueryChange,
  onRunAlternatives,
}: ProductRowProps) {
  const key = overrideKey(storeName, product.searchTerm);
  const showReplace = replaceKey === key;
  const replacementChoices = replaceOptions[key] ?? [];
  const [showAlternatives, setShowAlternatives] = useState(false);
  const isSearchingAlternatives =
    alternativesIsPending &&
    alternativesVariables?.storeName === storeName &&
    alternativesVariables?.searchTerm === product.searchTerm;

  const hasAlternatives = product.alternatives.length > 0;
  const cheaperAlt = product.alternatives.find(
    (alt) => alt.price < product.price,
  );

  return (
    <View
      style={[
        styles.productRow,
        product.isOutOfStock && styles.productRowOutOfStock,
        product.isAdded && styles.productRowAdded,
      ]}
    >
      {/* Header: name + unit + price */}
      <View style={styles.productRowHeader}>
        <View style={styles.productRowInfo}>
          <Text style={styles.productRowName} numberOfLines={1}>
            {product.productName}
          </Text>
          {product.unitInfo ? (
            <Text style={styles.productRowUnit}>
              {(product.unitInfo as { unit?: string }).unit ?? ""} {(product.unitInfo as { unitPrice?: number }).unitPrice ? `· $${(product.unitInfo as { unitPrice?: number }).unitPrice}/u` : ""}
            </Text>
          ) : null}
          {recommendation ? (
            <Text style={styles.productRowRec}>
              Ir a {recommendation.storeName} → {formatAmount(recommendation.lineTotal)}
            </Text>
          ) : null}
          {cheaperAlt && !product.isAdded && !product.isOutOfStock ? (
            <Text style={styles.cheaperAltHint}>
              Alternativa más barata: {formatAmount(cheaperAlt.price * product.quantity)}
            </Text>
          ) : null}
        </View>
        <View style={styles.productRowPrice}>
          {product.isCheapest ? (
            <Badge bgColor="#dcfce7" textColor="#166534">
              + barato
            </Badge>
          ) : null}
          <Text style={[styles.productRowAmount, product.isCheapest && styles.productRowAmountCheapest]}>
            {formatAmount(product.lineTotal)}
          </Text>
          <Text style={styles.productRowQty}>x{product.quantity}</Text>
        </View>
      </View>

      {/* Action bar: qty, added, out-of-stock, link — compact icons */}
      <View style={styles.productRowActions}>
        <View style={styles.qtyRow}>
          <Pressable
            onPress={() => onUpdateQuantity(product.searchTerm, -1)}
            style={styles.iconActionBtn}
            hitSlop={6}
          >
            <Minus size={14} color={colors.text} />
          </Pressable>
          <Text style={styles.qtyLabel}>{product.quantity}</Text>
          <Pressable
            onPress={() => onUpdateQuantity(product.searchTerm, 1)}
            style={styles.iconActionBtn}
            hitSlop={6}
          >
            <Plus size={14} color={colors.text} />
          </Pressable>
        </View>

        <Pressable
          onPress={() => onSetOverride(storeName, product.searchTerm, { isAdded: !product.isAdded })}
          style={[styles.iconActionBtn, product.isAdded && styles.iconActionBtnActive]}
          hitSlop={6}
        >
          <Check size={14} color={product.isAdded ? "#ffffff" : colors.mutedForeground} />
        </Pressable>

        {!product.isAdded ? (
          <Pressable
            onPress={() => onSetOverride(storeName, product.searchTerm, { isOutOfStock: !product.isOutOfStock })}
            style={[styles.iconActionBtn, product.isOutOfStock && styles.iconActionBtnWarning]}
            hitSlop={6}
          >
            <XCircle size={14} color={product.isOutOfStock ? "#92400e" : colors.mutedForeground} />
          </Pressable>
        ) : null}

        {product.link ? (
          <Pressable
            onPress={() => {
              if (product.link) {
                void import("react-native").then(({ Linking }) => Linking.openURL(product.link));
              }
            }}
            style={styles.iconActionBtn}
            hitSlop={6}
          >
            <ExternalLink size={14} color={colors.mutedForeground} />
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => onToggleReplace(key, product.searchTerm)}
          style={styles.replaceToggleBtn}
          hitSlop={6}
        >
          <Text style={styles.replaceToggleText}>
            {showReplace ? "Ocultar" : "Cambiar"}
          </Text>
        </Pressable>
      </View>

      {/* Collapsible alternatives (C2) */}
      {hasAlternatives && !showReplace ? (
        <>
          <Pressable
            onPress={() => setShowAlternatives(!showAlternatives)}
            style={styles.alternativesToggle}
          >
            {showAlternatives ? (
              <ChevronUp size={14} color={colors.primary} />
            ) : (
              <ChevronDown size={14} color={colors.primary} />
            )}
            <Text style={styles.alternativesToggleText}>
              {product.alternatives.length} alternativa{product.alternatives.length !== 1 ? "s" : ""}
            </Text>
          </Pressable>
          {showAlternatives ? (
            <View style={styles.alternativesList}>
              {product.alternatives.map((alt) => (
                <Pressable
                  key={alt.link}
                  onPress={() => onSetOverride(storeName, product.searchTerm, { replacement: alt })}
                  style={styles.alternativeItem}
                >
                  <Text style={styles.alternativeItemName} numberOfLines={1}>{alt.productName}</Text>
                  <Text style={[
                    styles.alternativeItemPrice,
                    alt.price < product.price && styles.alternativeItemPriceCheaper,
                  ]}>
                    {formatAmount(alt.price * product.quantity)}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </>
      ) : null}

      {/* Replace search panel */}
      {showReplace ? (
        <View style={styles.replacePanel}>
          <View style={styles.replaceSearch}>
            <StyledTextInput
              value={replaceQuery}
              onChangeText={onReplaceQueryChange}
              placeholder="Buscar reemplazo..."
              style={styles.replaceInput}
            />
            <Button
              variant="outline"
              size="sm"
              loading={isSearchingAlternatives}
              onPress={() =>
                onRunAlternatives(
                  storeName,
                  product.searchTerm,
                  replaceQuery.trim().length > 1 ? replaceQuery : product.searchTerm,
                )
              }
            >
              Buscar
            </Button>
          </View>
          {replacementChoices.map((alternative) => (
            <Pressable
              key={alternative.link}
              onPress={() => onSetOverride(storeName, product.searchTerm, { replacement: alternative })}
              style={styles.alternativeItem}
            >
              <Text style={styles.alternativeItemName} numberOfLines={1}>{alternative.productName}</Text>
              <Text style={styles.alternativeItemPrice}>
                {formatAmount(alternative.price * product.quantity)}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Collapsible promo banner for a store (C1). */
function StorePromoBanner({
  promos,
  onSelectPromo,
  selectedPromoId,
}: {
  promos: BankPromo[];
  onSelectPromo: (promo: BankPromo | null) => void;
  selectedPromoId: string | null;
}) {
  const [expanded, setExpanded] = useState(false);

  if (promos.length === 0) return null;

  // Show best promo per bank
  const bestByBank = new Map<string, BankPromo>();
  for (const promo of promos) {
    const existing = bestByBank.get(promo.bankSlug);
    if (!existing || promo.discountPercent > existing.discountPercent) {
      bestByBank.set(promo.bankSlug, promo);
    }
  }
  const bankPromos = [...bestByBank.values()].sort((a, b) => b.discountPercent - a.discountPercent);

  return (
    <View style={styles.promoBanner}>
      <Pressable onPress={() => setExpanded(!expanded)} style={styles.promoBannerToggle}>
        <CreditCard size={14} color={colors.primary} />
        <Text style={styles.promoBannerTitle}>
          {bankPromos.length} promo{bankPromos.length !== 1 ? "s" : ""} bancaria{bankPromos.length !== 1 ? "s" : ""}
        </Text>
        {expanded ? (
          <ChevronUp size={14} color={colors.primary} />
        ) : (
          <ChevronDown size={14} color={colors.primary} />
        )}
      </Pressable>
      {expanded ? (
        <View style={styles.promoList}>
          {bankPromos.map((promo) => {
            const isSelected = selectedPromoId === promo.id;
            const days = parseJsonArray(promo.daysOfWeek);
            return (
              <Pressable
                key={promo.id}
                onPress={() => onSelectPromo(isSelected ? null : promo)}
                style={[styles.promoItem, isSelected && styles.promoItemSelected]}
              >
                <View style={styles.promoItemHeader}>
                  <Text style={styles.promoBank}>{promo.bankDisplayName}</Text>
                  <Badge bgColor="#dcfce7" textColor="#166534">
                    -{promo.discountPercent}%
                  </Badge>
                </View>
                {days.length > 0 ? (
                  <Text style={styles.promoDays}>{days.join(", ")}</Text>
                ) : null}
                {promo.capAmount ? (
                  <Text style={styles.promoCap}>Tope: {formatAmount(promo.capAmount)}</Text>
                ) : null}
                {isSelected ? (
                  <Text style={styles.promoApplied}>Descuento aplicado al total</Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

interface StoreCartCardProps {
  cart: AdjustedStoreCart;
  rank: number;
  isSaved: boolean;
  promos: BankPromo[];
  overrides: Map<string, ProductOverride>;
  replaceKey: string | null;
  replaceQuery: string;
  replaceOptions: Record<string, AlternativeProduct[]>;
  alternativesIsPending: boolean;
  alternativesVariables: { storeName: string; searchTerm: string } | null;
  outOfStockRecommendation: Map<string, { storeName: string; lineTotal: number }>;
  onToggleSave: (cart: AdjustedStoreCart) => void;
  onUpdateQuantity: (term: string, delta: number) => void;
  onSetOverride: (storeName: string, searchTerm: string, update: Partial<ProductOverride>) => void;
  onToggleReplace: (key: string, searchTerm: string) => void;
  onReplaceQueryChange: (query: string) => void;
  onRunAlternatives: (storeName: string, searchTerm: string, query: string) => void;
}

function StoreCartCard({
  cart,
  rank,
  isSaved,
  promos,
  overrides,
  replaceKey,
  replaceQuery,
  replaceOptions,
  alternativesIsPending,
  alternativesVariables,
  outOfStockRecommendation,
  onToggleSave,
  onUpdateQuantity,
  onSetOverride,
  onToggleReplace,
  onReplaceQueryChange,
  onRunAlternatives,
}: StoreCartCardProps) {
  const [selectedPromo, setSelectedPromo] = useState<BankPromo | null>(null);
  const isWinner = rank === 0;

  const pendingProducts = cart.products.filter((p) => !p.isAdded && !p.isOutOfStock);
  const addedProducts = cart.products.filter((p) => p.isAdded);
  const outProducts = cart.products.filter((p) => p.isOutOfStock);

  // Calculate discounted total
  const baseTotal = cart.totalPrice;
  let discountedTotal = baseTotal;
  if (selectedPromo) {
    const discount = baseTotal * (selectedPromo.discountPercent / 100);
    const cappedDiscount = selectedPromo.capAmount ? Math.min(discount, selectedPromo.capAmount) : discount;
    discountedTotal = baseTotal - cappedDiscount;
  }

  const groups: Array<{ title: string; products: AdjustedProduct[]; color: string }> = [
    { title: "Pendientes", products: pendingProducts, color: colors.text },
    { title: "Ya agregados", products: addedProducts, color: "#166534" },
    { title: "Sin stock", products: outProducts, color: "#92400e" },
  ];

  return (
    <Card style={[styles.storeCard, isWinner && styles.storeCardWinner]}>
      {isWinner ? <View style={styles.winnerAccent} /> : null}
      <CardContent>
        <View style={styles.storeCardHeader}>
          <View style={styles.storeCardInfo}>
            <StoreAvatar storeName={cart.storeName} />
            <View style={styles.storeCardMeta}>
              <View style={styles.storeNameRow}>
                <Text style={styles.storeCardName}>{cart.storeName}</Text>
                {isWinner ? (
                  <View style={styles.winnerBadge}>
                    <Trophy size={12} color="#d97706" />
                    <Text style={styles.winnerBadgeText}>Mejor precio</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.storeCardSub}>
                {cart.products.length}/{cart.totalSearched} productos · {cart.cheapestCount} más baratos
              </Text>
            </View>
          </View>
          <View style={styles.storeCardRight}>
            {selectedPromo ? (
              <>
                <Text style={styles.storeCardTotalStrikethrough}>{formatAmount(baseTotal)}</Text>
                <Text style={styles.storeCardTotalDiscounted}>{formatAmount(discountedTotal)}</Text>
              </>
            ) : (
              <Text style={styles.storeCardTotal}>{formatAmount(baseTotal)}</Text>
            )}
            <Pressable
              onPress={() => onToggleSave(cart)}
              hitSlop={8}
              style={styles.saveIconButton}
            >
              {isSaved ? (
                <BookmarkCheck size={20} color={colors.primary} />
              ) : (
                <Bookmark size={20} color={colors.mutedForeground} />
              )}
            </Pressable>
          </View>
        </View>

        {/* Promo banner (C1) */}
        <StorePromoBanner
          promos={promos}
          onSelectPromo={setSelectedPromo}
          selectedPromoId={selectedPromo?.id ?? null}
        />

        {groups.map((group) =>
          group.products.length > 0 ? (
            <View key={group.title} style={styles.productGroup}>
              <Text style={[styles.productGroupTitle, { color: group.color }]}>
                {group.title} ({group.products.length})
              </Text>
              {group.products.map((product) => (
                <ProductRow
                  key={`${cart.storeName}-${product.searchTerm}`}
                  product={product}
                  storeName={cart.storeName}
                  overrides={overrides}
                  replaceKey={replaceKey}
                  replaceQuery={replaceQuery}
                  replaceOptions={replaceOptions}
                  alternativesIsPending={alternativesIsPending}
                  alternativesVariables={alternativesVariables}
                  recommendation={outOfStockRecommendation.get(overrideKey(cart.storeName, product.searchTerm))}
                  onUpdateQuantity={onUpdateQuantity}
                  onSetOverride={onSetOverride}
                  onToggleReplace={onToggleReplace}
                  onReplaceQueryChange={onReplaceQueryChange}
                  onRunAlternatives={onRunAlternatives}
                />
              ))}
            </View>
          ) : null,
        )}
      </CardContent>
    </Card>
  );
}

export default function ShoppingPlanScreen() {
  const shoppingPlan = useShoppingPlan();
  const alternativesSearch = useShoppingAlternatives();
  const savedCartsQuery = useSavedCarts();
  const saveCart = useSaveCart();
  const deleteSavedCart = useDeleteSavedCart();
  const refreshSavedCart = useRefreshSavedCart();
  const promosQuery = usePromos();
  const allPromos = promosQuery.data ?? [];

  const [termInput, setTermInput] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [overrides, setOverrides] = useState<Map<string, ProductOverride>>(new Map());
  const [replaceKey, setReplaceKey] = useState<string | null>(null);
  const [replaceQuery, setReplaceQuery] = useState("");
  const [replaceOptions, setReplaceOptions] = useState<Record<string, AlternativeProduct[]>>({});
  const [localError, setLocalError] = useState<string | null>(null);

  const canSearch = items.length > 0 && !shoppingPlan.isPending;

  const quantityByTerm = useMemo(
    () => new Map(items.map((item) => [item.term.toLowerCase(), item.quantity])),
    [items],
  );

  const adjustedCarts = useMemo<AdjustedStoreCart[]>(() => {
    const source = shoppingPlan.data?.storeCarts ?? [];

    const carts = source.map((cart) => {
      const products: AdjustedProduct[] = cart.products.map((product) => {
        const key = overrideKey(cart.storeName, product.searchTerm);
        const override = overrides.get(key);
        const replacement = override?.replacement;
        const quantity = quantityByTerm.get(product.searchTerm.toLowerCase()) ?? product.quantity ?? 1;
        const price = replacement?.price ?? product.price;

        return {
          ...product,
          productName: replacement?.productName ?? product.productName,
          price,
          lineTotal: price * quantity,
          listPrice: replacement?.listPrice ?? product.listPrice,
          link: replacement?.link ?? product.link,
          imageUrl: replacement?.imageUrl ?? product.imageUrl,
          unitInfo: replacement?.unitInfo ?? product.unitInfo,
          quantity,
          isAdded: override?.isAdded ?? false,
          isOutOfStock: override?.isOutOfStock ?? false,
        };
      });

      const activeProducts = products.filter((product) => !product.isOutOfStock);

      return {
        ...cart,
        products,
        totalPrice: activeProducts.reduce((sum, product) => sum + product.lineTotal, 0),
        cheapestCount: activeProducts.filter((product) => product.isCheapest).length,
      };
    });

    // Sort by totalPrice ascending — cheapest first (C3)
    return carts.sort((a, b) => a.totalPrice - b.totalPrice);
  }, [shoppingPlan.data?.storeCarts, overrides, quantityByTerm]);

  /** Get promos matching a store name. */
  const getStorePromos = useCallback(
    (storeName: string): BankPromo[] => {
      return allPromos.filter((promo) =>
        promo.storeName.toLowerCase().includes(storeName.toLowerCase()) ||
        storeName.toLowerCase().includes(promo.storeName.toLowerCase()),
      );
    },
    [allPromos],
  );

  const savedCarts = savedCartsQuery.data ?? [];
  const savedCartByStore = useMemo(
    () => new Map(savedCarts.map((savedCart) => [savedCart.storeName, savedCart])),
    [savedCarts],
  );

  const outOfStockRecommendation = useMemo(() => {
    const recommendation = new Map<string, { storeName: string; lineTotal: number }>();

    for (const cart of adjustedCarts) {
      for (const product of cart.products) {
        if (!product.isOutOfStock) continue;
        const candidate = adjustedCarts
          .flatMap((current) =>
            current.products
              .filter(
                (currentProduct) =>
                  currentProduct.searchTerm === product.searchTerm &&
                  !currentProduct.isOutOfStock &&
                  current.storeName !== cart.storeName,
              )
              .map((currentProduct) => ({
                storeName: current.storeName,
                lineTotal: currentProduct.lineTotal,
              })),
          )
          .sort((a, b) => a.lineTotal - b.lineTotal)[0];

        if (candidate) {
          recommendation.set(overrideKey(cart.storeName, product.searchTerm), candidate);
        }
      }
    }

    return recommendation;
  }, [adjustedCarts]);

  const addItem = () => {
    const cleanTerm = termInput.trim();
    if (cleanTerm.length < 2) {
      return;
    }

    setItems((previous) => {
      const existing = previous.find((item) => item.term.toLowerCase() === cleanTerm.toLowerCase());
      if (existing) {
        return previous.map((item) =>
          item.term.toLowerCase() === cleanTerm.toLowerCase()
            ? { ...item, quantity: Math.min(99, item.quantity + 1) }
            : item,
        );
      }

      return [...previous, { term: cleanTerm, quantity: 1 }];
    });
    setTermInput("");
  };

  const updateQuantity = (term: string, delta: number) => {
    setItems((previous) =>
      previous.map((item) => {
        if (item.term !== term) {
          return item;
        }
        const quantity = Math.max(1, Math.min(99, item.quantity + delta));
        return { ...item, quantity };
      }),
    );
  };

  const removeItem = (term: string) => {
    setItems((previous) => previous.filter((item) => item.term !== term));
  };

  const runSearch = async () => {
    setLocalError(null);
    try {
      await shoppingPlan.mutateAsync({ searchItems: items });
      setOverrides(new Map());
      setReplaceOptions({});
      setReplaceKey(null);
      setReplaceQuery("");
    } catch (error) {
      setLocalError(getMobileErrorMessage(error));
    }
  };

  const setProductOverride = (storeName: string, searchTerm: string, update: Partial<ProductOverride>) => {
    const key = overrideKey(storeName, searchTerm);
    setOverrides((previous) => {
      const next = new Map(previous);
      const current = next.get(key) ?? { isAdded: false, isOutOfStock: false, replacement: null };
      next.set(key, { ...current, ...update });
      return next;
    });
  };

  const runAlternativesSearch = async (storeName: string, searchTerm: string, query: string) => {
    try {
      const result = await alternativesSearch.mutateAsync({
        storeName,
        searchTerm,
        query,
      });
      const key = overrideKey(storeName, searchTerm);
      setReplaceOptions((previous) => ({
        ...previous,
        [key]: result.alternatives,
      }));
    } catch (error) {
      setLocalError(getMobileErrorMessage(error));
    }
  };

  const toggleSaveStoreCart = async (cart: AdjustedStoreCart) => {
    const existing = savedCartByStore.get(cart.storeName);

    try {
      if (existing) {
        await deleteSavedCart.mutateAsync(existing.id);
        return;
      }

      const input: SaveCartInput = {
        storeName: cart.storeName,
        searchTerms: items.map((item) => item.term),
        searchItems: items,
        products: toRecordArray(cart.products),
        totalPrice: cart.totalPrice,
        cheapestCount: cart.cheapestCount,
        missingTerms: cart.missingTerms,
        totalSearched: cart.totalSearched,
      };
      await saveCart.mutateAsync(input);
    } catch (error) {
      setLocalError(getMobileErrorMessage(error));
    }
  };

  const handleToggleReplace = (key: string, searchTerm: string) => {
    const isShowing = replaceKey === key;
    setReplaceKey(isShowing ? null : key);
    if (!isShowing) {
      setReplaceQuery(searchTerm);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader />
      <ScrollView
        bounces={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <ShoppingCart size={22} color={colors.primary} strokeWidth={2} />
          <Text style={styles.title}>Ahorrá</Text>
        </View>
        <Text style={styles.subtitle}>Compará precios entre supermercados</Text>

        <Card style={styles.searchCard}>
          <CardContent>
            <View style={styles.searchRow}>
              <StyledTextInput
                placeholder="Ej: leche entera 1L"
                value={termInput}
                onChangeText={setTermInput}
                onSubmitEditing={addItem}
                returnKeyType="done"
                containerStyle={styles.searchInput}
              />
              <Button variant="outline" size="default" onPress={addItem}>
                Agregar
              </Button>
            </View>

            {items.length > 0 ? (
              <View style={styles.itemsList}>
                {items.map((item) => (
                  <ProductChip
                    key={item.term}
                    item={item}
                    onIncrement={() => updateQuantity(item.term, 1)}
                    onDecrement={() => updateQuantity(item.term, -1)}
                    onRemove={() => removeItem(item.term)}
                  />
                ))}
              </View>
            ) : null}

            <Button
              onPress={() => void runSearch()}
              disabled={!canSearch}
              loading={shoppingPlan.isPending}
              style={styles.searchButton}
            >
              Comparar precios
            </Button>
          </CardContent>
        </Card>

        {localError ? (
          <Card style={styles.errorCard}>
            <CardContent>
              <Text style={styles.errorText}>{localError}</Text>
            </CardContent>
          </Card>
        ) : null}

        {shoppingPlan.data?.notFound.length ? (
          <Card style={styles.warningCard}>
            <CardContent>
              <Text style={styles.warningText}>
                Sin resultados: {shoppingPlan.data.notFound.join(", ")}
              </Text>
            </CardContent>
          </Card>
        ) : null}

        {adjustedCarts.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resultados</Text>
            {adjustedCarts.map((cart, index) => (
              <StoreCartCard
                key={cart.storeName}
                cart={cart}
                rank={index}
                isSaved={savedCartByStore.has(cart.storeName)}
                promos={getStorePromos(cart.storeName)}
                overrides={overrides}
                replaceKey={replaceKey}
                replaceQuery={replaceQuery}
                replaceOptions={replaceOptions}
                alternativesIsPending={alternativesSearch.isPending}
                alternativesVariables={
                  alternativesSearch.variables
                    ? {
                        storeName: alternativesSearch.variables.storeName,
                        searchTerm: alternativesSearch.variables.searchTerm,
                      }
                    : null
                }
                outOfStockRecommendation={outOfStockRecommendation}
                onToggleSave={(c) => void toggleSaveStoreCart(c)}
                onUpdateQuantity={updateQuantity}
                onSetOverride={setProductOverride}
                onToggleReplace={handleToggleReplace}
                onReplaceQueryChange={setReplaceQuery}
                onRunAlternatives={(sn, st, q) => void runAlternativesSearch(sn, st, q)}
              />
            ))}
          </View>
        ) : null}

        {savedCarts.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Guardados</Text>
            <Text style={styles.sectionSubtitle}>Tus carritos guardados y actualizables</Text>
            {savedCarts.map((savedCart) => {
              const adapted = fromSavedCart(savedCart);
              return (
                <Card key={savedCart.id} style={styles.savedCartCard}>
                  <CardContent>
                    <View style={styles.savedCartHeader}>
                      <StoreAvatar storeName={adapted.storeName} size={36} />
                      <View style={styles.savedCartMeta}>
                        <Text style={styles.savedCartName}>{adapted.storeName}</Text>
                        <Text style={styles.savedCartSub}>
                          {new Date(savedCart.savedAt).toLocaleDateString("es-AR")} · {adapted.products.length} productos
                        </Text>
                      </View>
                      <Text style={styles.savedCartTotal}>{formatAmount(adapted.totalPrice)}</Text>
                    </View>
                    <View style={styles.savedCartActions}>
                      <Button
                        variant="outline"
                        size="sm"
                        onPress={() => {
                          setItems(
                            savedCart.searchTerms.map((term) => {
                              const quantityFromProducts = adapted.products.find(
                                (product) => product.searchTerm === term,
                              )?.quantity;
                              return {
                                term,
                                quantity: quantityFromProducts ?? 1,
                              };
                            }),
                          );
                        }}
                      >
                        Cargar lista
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        loading={refreshSavedCart.isPending}
                        onPress={() => void refreshSavedCart.mutateAsync(savedCart.id)}
                      >
                        <RefreshCw size={13} color={colors.text} />
                        Refrescar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onPress={() => void deleteSavedCart.mutateAsync(savedCart.id)}
                      >
                        <Trash2 size={13} color="#ffffff" />
                        Eliminar
                      </Button>
                    </View>
                  </CardContent>
                </Card>
              );
            })}
          </View>
        ) : null}

        {savedCarts.length === 0 && adjustedCarts.length === 0 && !shoppingPlan.isPending ? (
          <EmptyState
            icon={<ShoppingCart size={32} color={colors.mutedForeground} />}
            title="Empezá a comparar"
            subtitle="Agregá productos y compará precios entre supermercados"
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 24,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.pageTitle,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
  },
  searchCard: {
    marginBottom: spacing.md,
  },
  searchRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-end",
  },
  searchInput: {
    flex: 1,
  },
  itemsList: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  searchButton: {
    marginTop: spacing.md,
  },
  errorCard: {
    backgroundColor: "#fee2e2",
    marginBottom: spacing.md,
  },
  errorText: {
    fontFamily: fontFamily.sans,
    color: "#b91c1c",
    fontSize: 14,
  },
  warningCard: {
    backgroundColor: "#fffbeb",
    marginBottom: spacing.md,
  },
  warningText: {
    fontFamily: fontFamily.sans,
    color: "#92400e",
    fontSize: 14,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontFamily: fontFamily.sans,
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
  },
  storeCard: {
    marginBottom: spacing.md,
  },
  storeCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  storeCardInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  storeAvatar: {
    alignItems: "center",
    justifyContent: "center",
  },
  storeAvatarText: {
    fontFamily: fontFamily.sans,
    fontWeight: "800",
  },
  storeCardMeta: {
    flex: 1,
  },
  storeCardName: {
    fontFamily: fontFamily.sans,
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  storeCardSub: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  storeCardRight: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  storeCardTotal: {
    fontFamily: fontFamily.sans,
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
  },
  productGroup: {
    marginTop: spacing.md,
  },
  productGroupTitle: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  productRow: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  productRowOutOfStock: {
    backgroundColor: "#fffbeb",
    borderColor: "#fcd34d",
  },
  productRowAdded: {
    backgroundColor: "#f0fdf4",
    borderColor: "#86efac",
  },
  productRowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  productRowInfo: {
    flex: 1,
  },
  productRowTerm: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  productRowName: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  productRowRec: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    color: "#92400e",
    marginTop: 4,
  },
  productRowPrice: {
    alignItems: "flex-end",
    gap: 4,
  },
  productRowAmount: {
    fontFamily: fontFamily.sans,
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  productRowAmountCheapest: {
    fontFamily: fontFamily.sans,
    color: "#065f46",
  },
  productRowButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  replaceToggle: {
    marginTop: spacing.xs,
    alignSelf: "flex-start",
  },
  replacePanel: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  replaceSearch: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-end",
  },
  replaceInput: {
    flex: 1,
  },
  alternativeBtn: {
    width: "100%",
    justifyContent: "flex-start" as const,
  },
  saveIconButton: {
    padding: spacing.xs,
  },
  productChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
    gap: spacing.sm,
  },
  productChipLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  productChipTerm: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    flexShrink: 1,
  },
  productChipActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
  },
  productChipQty: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    minWidth: 18,
    textAlign: "center",
  },
  chipQtyBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  chipRemoveBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.destructiveForeground,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
  },
  savedCartCard: {
    marginBottom: spacing.md,
  },
  savedCartHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  savedCartMeta: {
    flex: 1,
  },
  savedCartName: {
    fontFamily: fontFamily.sans,
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  savedCartSub: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  savedCartTotal: {
    fontFamily: fontFamily.sans,
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
  },
  savedCartActions: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  /* --- Winner highlighting (C3) --- */
  storeCardWinner: {
    borderColor: colors.primary,
    borderWidth: 2,
    overflow: "hidden" as const,
  },
  winnerAccent: {
    position: "absolute" as const,
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.primary,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  storeNameRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.xs,
    flexWrap: "wrap" as const,
  },
  winnerBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: "#fffbeb",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  winnerBadgeText: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    fontWeight: "700" as const,
    color: "#d97706",
  },
  storeCardTotalStrikethrough: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    color: colors.mutedForeground,
    textDecorationLine: "line-through" as const,
  },
  storeCardTotalDiscounted: {
    fontFamily: fontFamily.sans,
    fontSize: 20,
    fontWeight: "800" as const,
    color: "#059669",
  },
  /* --- Compact action bar (C5) --- */
  productRowActions: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.sm,
    marginTop: spacing.sm,
    flexWrap: "wrap" as const,
  },
  qtyRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  qtyLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    fontWeight: "700" as const,
    color: colors.text,
    minWidth: 20,
    textAlign: "center" as const,
  },
  iconActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  iconActionBtnActive: {
    backgroundColor: "#16a34a",
    borderColor: "#16a34a",
  },
  iconActionBtnWarning: {
    backgroundColor: "#fffbeb",
    borderColor: "#fcd34d",
  },
  productRowUnit: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  productRowQty: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    color: colors.mutedForeground,
  },
  cheaperAltHint: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    color: "#059669",
    marginTop: 4,
  },
  replaceToggleBtn: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
  },
  replaceToggleText: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    color: colors.primary,
    fontWeight: "600" as const,
  },
  /* --- Alternatives (C2) --- */
  alternativesToggle: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    marginTop: spacing.sm,
    paddingVertical: 4,
  },
  alternativesToggleText: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    color: colors.primary,
    fontWeight: "600" as const,
  },
  alternativesList: {
    marginTop: spacing.xs,
    gap: 4,
  },
  alternativeItem: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  alternativeItemName: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  alternativeItemPrice: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    fontWeight: "700" as const,
    color: colors.text,
  },
  alternativeItemPriceCheaper: {
    color: "#059669",
  },
  /* --- Promo banner (C1) --- */
  promoBanner: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  promoBannerToggle: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingVertical: 4,
  },
  promoBannerTitle: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.primary,
    flex: 1,
  },
  promoList: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  promoItem: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  promoItemSelected: {
    borderColor: colors.primary,
    backgroundColor: "#eef2ff",
  },
  promoItemHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 4,
  },
  promoBank: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    fontWeight: "700" as const,
    color: colors.text,
  },
  promoDays: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    color: colors.mutedForeground,
  },
  promoCap: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  promoApplied: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    fontWeight: "600" as const,
    color: colors.primary,
    marginTop: 4,
  },
});
