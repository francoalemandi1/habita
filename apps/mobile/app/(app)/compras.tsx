import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { router } from "expo-router";
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CreditCard,
  ExternalLink,
  List,
  Minus,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  Trophy,
  X,
  XCircle,
  Share2,
} from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useDeleteSavedCart, useRefreshSavedCart, useSaveCart, useSavedCarts } from "@/hooks/use-saved-carts";
import { useProductCatalog, useShoppingAlternatives, useShoppingPlan } from "@/hooks/use-shopping-plan";
import { usePromos, usePromoPipelineStatus, useRefreshPromos, parseJsonArray } from "@/hooks/use-promos";
import { TabBar } from "@/components/ui/tab-bar";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { useMilestone } from "@/hooks/use-milestone";
import { useCelebration } from "@/hooks/use-celebration";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StyledTextInput } from "@/components/ui/text-input";
import { ProductAutocomplete } from "@/components/features/product-autocomplete";
import { ScreenHeader } from "@/components/features/screen-header";
import { fontFamily, radius, spacing, storeColorFallback, storeColors, typography } from "@/theme";
import { useThemeColors } from "@/hooks/use-theme";
import { useFirstVisit } from "@/hooks/use-first-visit";
import { SectionGuideCard } from "@/components/features/section-guide-card";
import { useSectionToured } from "@/hooks/use-guided-tour";

import type {
  AlternativeProduct,
  SavedCart,
  SaveCartInput,
  SearchItem,
  StoreCart,
} from "@habita/contracts";
import type { BankPromo } from "@/hooks/use-promos";
import type { ThemeColors } from "@/theme";

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
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

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

interface SimpleItemChipProps {
  item: SearchItem;
  onRemove: () => void;
}

function SimpleItemChip({ item, onRemove }: SimpleItemChipProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.productChip}>
      <Text style={styles.productChipTerm} numberOfLines={1}>{item.term}</Text>
      <Pressable onPress={onRemove} hitSlop={6}>
        <X size={13} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  almacen: "Almacén",
  frutas_verduras: "Frutas y Verduras",
  carnes: "Carnes",
  lacteos: "Lácteos",
  panaderia_dulces: "Panadería y Dulces",
  bebidas: "Bebidas",
  limpieza: "Limpieza",
  perfumeria: "Perfumería",
};

interface CatalogModalProps {
  visible: boolean;
  addedTerms: Set<string>;
  onClose: () => void;
  onToggleItem: (name: string) => void;
}

function CatalogModal({ visible, addedTerms, onClose, onToggleItem }: CatalogModalProps) {
  const catalog = useProductCatalog();
  const [search, setSearch] = useState("");
  const products = catalog.data?.products ?? [];
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    const groups = new Map<string, typeof products>();
    for (const product of products) {
      if (query && !product.name.toLowerCase().includes(query)) continue;
      const list = groups.get(product.category);
      if (list) {
        list.push(product);
      } else {
        groups.set(product.category, [product]);
      }
    }
    return groups;
  }, [products, search]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.catalogModalContainer}>
        <View style={styles.catalogModalHeader}>
          <Text style={styles.catalogModalTitle}>Catálogo</Text>
          <Pressable onPress={onClose} hitSlop={8} style={styles.catalogConfirmBtn}>
            <Text style={styles.catalogConfirmText}>Confirmar</Text>
          </Pressable>
        </View>

        <View style={styles.catalogSearchRow}>
          <StyledTextInput
            placeholder="Buscar producto..."
            value={search}
            onChangeText={setSearch}
            containerStyle={styles.catalogSearchInput}
          />
        </View>

        {catalog.isPending ? (
          <View style={styles.catalogModalLoading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <ScrollView
            style={styles.catalogModalScroll}
            contentContainerStyle={styles.catalogModalContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {[...filteredGroups.entries()].map(([category, items]) => (
              <View key={category} style={styles.catalogCategory}>
                <Text style={styles.catalogCategoryLabel}>
                  {CATEGORY_LABELS[category] ?? category}
                </Text>
                <View style={styles.catalogChipRow}>
                  {items.map((product) => {
                    const isAdded = addedTerms.has(product.name.toLowerCase());
                    return (
                      <Pressable
                        key={product.id}
                        onPress={() => onToggleItem(product.name)}
                        style={[styles.catalogChip, isAdded && styles.catalogChipAdded]}
                      >
                        {isAdded ? (
                          <Check size={11} color={colors.primary} />
                        ) : (
                          <Plus size={11} color={colors.mutedForeground} />
                        )}
                        <Text
                          style={[styles.catalogChipText, isAdded && styles.catalogChipTextAdded]}
                          numberOfLines={1}
                        >
                          {product.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
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
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

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

// ── Promo scoring helpers (mirrors src/lib/promos/scoring.ts) ───────────────

const DAY_INDEX_TO_NAME: Record<number, string> = {
  0: "Domingo", 1: "Lunes", 2: "Martes", 3: "Miércoles",
  4: "Jueves", 5: "Viernes", 6: "Sábado",
};
const DAY_SHORT: Record<string, string> = {
  Lunes: "Lun", Martes: "Mar", "Miércoles": "Mié",
  Jueves: "Jue", Viernes: "Vie", Sábado: "Sáb", Domingo: "Dom",
};

function getTodayDayName(): string {
  return DAY_INDEX_TO_NAME[new Date().getDay()] ?? "Lunes";
}

function scorePromo(promo: BankPromo, todayName: string): number {
  let score = promo.discountPercent;
  if (!promo.capAmount) score += 5;
  const days = parseJsonArray(promo.daysOfWeek);
  if (days.length === 0 || days.includes(todayName)) score += 10;
  return score;
}

function formatDaysShort(daysOfWeekJson: string): string {
  const days = parseJsonArray(daysOfWeekJson);
  if (days.length === 0 || days.length === 7) return "Todos los días";
  return days.map((d) => DAY_SHORT[d] ?? d).join(", ");
}

/** Best promo per bank sorted by score. */
function getBestPromosByBank(promos: BankPromo[], todayName: string): BankPromo[] {
  const bankMap = new Map<string, BankPromo>();
  for (const promo of promos) {
    const existing = bankMap.get(promo.bankSlug);
    if (!existing || scorePromo(promo, todayName) > scorePromo(existing, todayName)) {
      bankMap.set(promo.bankSlug, promo);
    }
  }
  return [...bankMap.values()].sort((a, b) => scorePromo(b, todayName) - scorePromo(a, todayName));
}

/** Collapsible promo banner for a store card (C1). */
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
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (promos.length === 0) return null;

  const todayName = getTodayDayName();
  const bestPerBank = getBestPromosByBank(promos, todayName);
  const best = bestPerBank[0]!;
  const extraCount = promos.length - bestPerBank.length;

  // All promos sorted by score (shown when expanded)
  const allSorted = [...promos].sort((a, b) => scorePromo(b, todayName) - scorePromo(a, todayName));
  const visiblePromos = expanded ? allSorted : bestPerBank;

  const selectedPromo = selectedPromoId ? promos.find((p) => p.id === selectedPromoId) : null;
  const hasSelection = !!selectedPromo;

  const summaryText = selectedPromo
    ? `${selectedPromo.discountPercent}% ${selectedPromo.bankDisplayName} aplicado`
    : bestPerBank.length === 1
      ? `${best.discountPercent}% ${best.bankDisplayName} · ${formatDaysShort(best.daysOfWeek)}`
      : `Hasta ${best.discountPercent}% dto · ${bestPerBank.length} bancos`;

  return (
    <View style={styles.promoBanner}>
      {/* Summary toggle row */}
      <Pressable
        onPress={() => setExpanded(!expanded)}
        style={[styles.promoBannerToggle, hasSelection && styles.promoBannerToggleActive]}
      >
        <CreditCard size={13} color={hasSelection ? colors.primary : colors.mutedForeground} />
        <Text style={[styles.promoBannerTitle, hasSelection && styles.promoBannerTitleActive]}>
          {summaryText}
        </Text>
        {expanded
          ? <ChevronUp size={13} color={hasSelection ? colors.primary : colors.mutedForeground} />
          : <ChevronDown size={13} color={hasSelection ? colors.primary : colors.mutedForeground} />
        }
      </Pressable>

      {/* Expanded promo list */}
      {expanded ? (
        <View style={styles.promoList}>
          {visiblePromos.map((promo) => {
            const isSelected = selectedPromoId === promo.id;
            const days = parseJsonArray(promo.daysOfWeek);
            const methods = parseJsonArray(promo.paymentMethods);
            const daysLabel = days.length > 0 ? days.map((d) => DAY_SHORT[d] ?? d).join(", ") : "Todos los días";
            return (
              <Pressable
                key={promo.id}
                onPress={() => onSelectPromo(isSelected ? null : promo)}
                style={[styles.promoItem, isSelected && styles.promoItemSelected]}
              >
                <View style={styles.promoItemRow}>
                  <View style={[styles.promoDiscountBadge, isSelected && styles.promoDiscountBadgeActive]}>
                    <Text style={[styles.promoDiscountText, isSelected && styles.promoDiscountTextActive]}>
                      {promo.discountPercent}%
                    </Text>
                  </View>
                  <View style={styles.promoItemBody}>
                    <Text style={[styles.promoBank, isSelected && styles.promoBankActive]}>
                      {promo.bankDisplayName}
                    </Text>
                    <View style={styles.promoMeta}>
                      <Text style={styles.promoDays}>{daysLabel}</Text>
                      {methods[0] ? (
                        <Text style={styles.promoDays}> · {methods[0]}</Text>
                      ) : null}
                      {promo.capAmount ? (
                        <Text style={styles.promoDays}> · tope {formatAmount(promo.capAmount)}</Text>
                      ) : null}
                    </View>
                  </View>
                  {isSelected ? (
                    <Check size={14} color={colors.primary} />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/* "N promos más" hint when collapsed */}
      {!expanded && extraCount > 0 ? (
        <Pressable onPress={() => setExpanded(true)} style={styles.promoExtraHint}>
          <Text style={styles.promoExtraHintText}>
            +{extraCount} promo{extraCount !== 1 ? "s" : ""} más de estos bancos
          </Text>
        </Pressable>
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
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

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

// ── Promos Section ────────────────────────────────────────────────────────────

interface PromosSectionProps {
  promos: BankPromo[];
  isLoading: boolean;
  isRunning: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}

/** Group promos by storeName, then within each store pick the best per bank. */
function groupPromosByStore(promos: BankPromo[], todayName: string) {
  const storeMap = new Map<string, BankPromo[]>();
  for (const promo of promos) {
    const list = storeMap.get(promo.storeName);
    if (list) {
      list.push(promo);
    } else {
      storeMap.set(promo.storeName, [promo]);
    }
  }

  const groups = [...storeMap.entries()].map(([storeName, storePromos]) => {
    const bestPerBank = getBestPromosByBank(storePromos, todayName);
    const bestScore = bestPerBank[0] ? scorePromo(bestPerBank[0], todayName) : 0;
    const bankCount = new Set(storePromos.map((p) => p.bankSlug)).size;
    return { storeName, promos: storePromos, bestPerBank, bestScore, bankCount };
  });

  // Sort by best score descending
  return groups.sort((a, b) => b.bestScore - a.bestScore);
}

function PromosSection({ promos, isLoading, isRunning, onRefresh, isRefreshing }: PromosSectionProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const promoSty = useMemo(() => createPromoStyles(colors), [colors]);

  const [promoSearch, setPromoSearch] = useState("");
  const [expandedStore, setExpandedStore] = useState<string | null>(null);
  const todayName = getTodayDayName();

  const filteredPromos = useMemo(() => {
    if (!promoSearch.trim()) return promos;
    const query = promoSearch.trim().toLowerCase();
    return promos.filter(
      (promo) =>
        promo.bankDisplayName.toLowerCase().includes(query) ||
        promo.storeName.toLowerCase().includes(query),
    );
  }, [promos, promoSearch]);

  const storeGroups = useMemo(
    () => groupPromosByStore(filteredPromos, todayName),
    [filteredPromos, todayName],
  );

  if (isLoading) {
    return (
      <View style={promoSty.loadingContainer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={promoSty.container}>
      {/* Header row */}
      <View style={promoSty.headerRow}>
        <Text style={styles.sectionTitle}>Promociones bancarias</Text>
        <Button
          variant="outline"
          size="sm"
          onPress={onRefresh}
          disabled={isRunning || isRefreshing}
          loading={isRunning || isRefreshing}
        >
          <RefreshCw size={13} color={colors.text} />
          Actualizar
        </Button>
      </View>

      {/* Pipeline running indicator */}
      {isRunning ? (
        <View style={promoSty.pipelineBanner}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={promoSty.pipelineText}>Buscando promociones bancarias...</Text>
        </View>
      ) : null}

      {/* Search filter */}
      {promos.length > 0 ? (
        <View style={promoSty.searchRow}>
          <Search size={14} color={colors.mutedForeground} />
          <StyledTextInput
            placeholder="Filtrar por banco o supermercado..."
            value={promoSearch}
            onChangeText={setPromoSearch}
            containerStyle={promoSty.searchInput}
          />
        </View>
      ) : null}

      {/* Promo list grouped by store */}
      {storeGroups.length > 0 ? (
        storeGroups.map((group) => {
          const isExpanded = expandedStore === group.storeName;
          const best = group.bestPerBank[0];
          return (
            <Card key={group.storeName} style={promoSty.storeCard}>
              <Pressable
                onPress={() => setExpandedStore(isExpanded ? null : group.storeName)}
                style={promoSty.storeHeader}
              >
                <StoreAvatar storeName={group.storeName} size={36} />
                <View style={promoSty.storeMeta}>
                  <Text style={promoSty.storeName}>{group.storeName}</Text>
                  <Text style={promoSty.storeSub}>
                    {group.promos.length} promo{group.promos.length !== 1 ? "s" : ""} de {group.bankCount} banco{group.bankCount !== 1 ? "s" : ""}
                  </Text>
                </View>
                {best ? (
                  <View style={promoSty.bestBadge}>
                    <Text style={promoSty.bestBadgeText}>{best.discountPercent}%</Text>
                  </View>
                ) : null}
                {isExpanded
                  ? <ChevronUp size={16} color={colors.mutedForeground} />
                  : <ChevronDown size={16} color={colors.mutedForeground} />
                }
              </Pressable>

              {isExpanded ? (
                <View style={promoSty.promoList}>
                  {group.bestPerBank.map((promo) => {
                    const days = parseJsonArray(promo.daysOfWeek);
                    const methods = parseJsonArray(promo.paymentMethods);
                    const daysLabel = days.length > 0
                      ? days.map((d) => DAY_SHORT[d] ?? d).join(", ")
                      : "Todos los días";
                    const isToday = days.length === 0 || days.includes(todayName);
                    return (
                      <View key={promo.id} style={promoSty.promoRow}>
                        <View style={[promoSty.discountBadge, isToday && promoSty.discountBadgeActive]}>
                          <Text style={[promoSty.discountText, isToday && promoSty.discountTextActive]}>
                            {promo.discountPercent}%
                          </Text>
                        </View>
                        <View style={promoSty.promoBody}>
                          <Text style={promoSty.promoBank}>{promo.bankDisplayName}</Text>
                          <View style={promoSty.promoMetaRow}>
                            <Text style={promoSty.promoMetaText}>{daysLabel}</Text>
                            {methods[0] ? (
                              <Text style={promoSty.promoMetaText}> · {methods[0]}</Text>
                            ) : null}
                            {promo.capAmount ? (
                              <Text style={promoSty.promoMetaText}> · tope {formatAmount(promo.capAmount)}</Text>
                            ) : null}
                          </View>
                        </View>
                        {isToday ? (
                          <Badge variant="success" size="sm">Hoy</Badge>
                        ) : null}
                      </View>
                    );
                  })}

                  {/* Show hint if there are more promos than best-per-bank */}
                  {group.promos.length > group.bestPerBank.length ? (
                    <Text style={promoSty.extraHint}>
                      +{group.promos.length - group.bestPerBank.length} promo{group.promos.length - group.bestPerBank.length !== 1 ? "s" : ""} más
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </Card>
          );
        })
      ) : (
        <EmptyState
          icon={<CreditCard size={32} color={colors.mutedForeground} />}
          title="No hay promos cargadas"
          subtitle={promoSearch ? "No hay promos que coincidan con tu búsqueda" : "Tocá Actualizar para buscar promociones bancarias"}
        />
      )}
    </View>
  );
}

export default function ShoppingPlanScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const searchMilestone = useMilestone("first-search");
  const { celebrate } = useCelebration();
  const ahorraWasToured = useSectionToured("ahorra");
  const shoppingPlan = useShoppingPlan();
  const catalog = useProductCatalog();
  const alternativesSearch = useShoppingAlternatives();
  const savedCartsQuery = useSavedCarts();
  const saveCart = useSaveCart();
  const deleteSavedCart = useDeleteSavedCart();
  const refreshSavedCart = useRefreshSavedCart();
  const promosQuery = usePromos();
  const allPromos = promosQuery.data ?? [];
  const pipelineStatus = usePromoPipelineStatus();
  const refreshPromos = useRefreshPromos();
  const queryClient = useQueryClient();

  const { isFirstVisit, dismiss: dismissGuide } = useFirstVisit("ahorra");

  const [activeSection, setActiveSection] = useState<"search" | "promos" | "saved">("search");
  const [termInput, setTermInput] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [overrides, setOverrides] = useState<Map<string, ProductOverride>>(new Map());
  const [replaceKey, setReplaceKey] = useState<string | null>(null);
  const [replaceQuery, setReplaceQuery] = useState("");
  const [replaceOptions, setReplaceOptions] = useState<Record<string, AlternativeProduct[]>>({});
  const [localError, setLocalError] = useState<string | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);

  // Auto-trigger promo refresh when no promos exist
  const hasAutoTriggered = useRef(false);
  useEffect(() => {
    if (
      !promosQuery.isPending &&
      allPromos.length === 0 &&
      !pipelineStatus.data?.isRunning &&
      !hasAutoTriggered.current
    ) {
      hasAutoTriggered.current = true;
      refreshPromos.mutate();
    }
  }, [promosQuery.isPending, allPromos.length, pipelineStatus.data?.isRunning, refreshPromos]);

  // Auto-invalidate promos when pipeline transitions from running → done
  const wasRunning = useRef(false);
  useEffect(() => {
    const isRunning = pipelineStatus.data?.isRunning ?? false;
    if (wasRunning.current && !isRunning) {
      void queryClient.invalidateQueries({ queryKey: ["mobile", "promos"] });
    }
    wasRunning.current = isRunning;
  }, [pipelineStatus.data?.isRunning, queryClient]);

  const canSearch = items.length > 0 && !shoppingPlan.isPending;

  const quantityByTerm = useMemo(
    () => new Map(items.map((item) => [item.term.toLowerCase(), item.quantity])),
    [items],
  );

  const addedTerms = useMemo(
    () => new Set(items.map((item) => item.term.toLowerCase())),
    [items],
  );

  const toggleItemFromCatalog = (name: string) => {
    setItems((previous) => {
      const exists = previous.some((item) => item.term.toLowerCase() === name.toLowerCase());
      if (exists) {
        return previous.filter((item) => item.term.toLowerCase() !== name.toLowerCase());
      }
      return [...previous, { term: name, quantity: 1 }];
    });
  };

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

  const addItem = (overrideTerm?: string) => {
    const cleanTerm = (overrideTerm ?? termInput).trim();
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
      void AsyncStorage.setItem("habita_shopping_first_search", "1");
      const wasFirst = await searchMilestone.complete();
      if (wasFirst) celebrate("first-search");
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

        <TabBar
          items={[
            { key: "search", label: "Buscar" },
            { key: "promos", label: "Promos", badge: allPromos.length || undefined },
            { key: "saved", label: "Guardados", badge: savedCarts.length || undefined },
          ]}
          activeKey={activeSection}
          onChange={(key) => setActiveSection(key as "search" | "promos" | "saved")}
          style={styles.sectionTabs}
        />

        {activeSection === "search" ? (
          <>
        {isFirstVisit && !ahorraWasToured ? (
          <SectionGuideCard
            steps={[
              {
                icon: <ShoppingCart size={16} color={colors.primary} />,
                title: "Agregá productos",
                description: "Escribí lo que necesitás o elegí del catálogo",
              },
              {
                icon: <Search size={16} color={colors.primary} />,
                title: "Buscamos en 11 supers",
                description: "Comparamos precios en tiempo real para vos",
              },
              {
                icon: <Trophy size={16} color={colors.primary} />,
                title: "Compará y ahorrá",
                description: "Te armamos el carrito más barato",
              },
            ]}
            onDismiss={dismissGuide}
          />
        ) : null}
        <Card style={styles.searchCard}>
          <CardContent>
            <View style={styles.searchRow}>
              <View style={styles.searchInput}>
                <ProductAutocomplete
                  placeholder="Ej: leche entera 1L"
                  value={termInput}
                  onChangeText={setTermInput}
                  onSelectProduct={(name) => {
                    addItem(name);
                  }}
                  onSubmitEditing={() => addItem()}
                  products={catalog.data?.products ?? []}
                />
              </View>
              <Button variant="outline" size="default" onPress={() => addItem()}>
                Agregar
              </Button>
            </View>

            {items.length > 0 ? (
              <View style={styles.itemsList}>
                {items.map((item) => (
                  <SimpleItemChip
                    key={item.term}
                    item={item}
                    onRemove={() => removeItem(item.term)}
                  />
                ))}
              </View>
            ) : null}

            <Pressable
              onPress={() => setShowCatalog(true)}
              style={styles.catalogBanner}
            >
              <View style={styles.catalogBannerIcon}>
                <List size={16} color={colors.primary} />
              </View>
              <View style={styles.catalogBannerContent}>
                <Text style={styles.catalogBannerTitle}>Ver catálogo de productos</Text>
                {(catalog.data?.products?.length ?? 0) > 0 ? (
                  <Text style={styles.catalogBannerCount}>
                    {catalog.data?.products?.length} productos disponibles
                  </Text>
                ) : null}
              </View>
              <ChevronRight size={16} color={colors.mutedForeground} />
            </Pressable>

            <Button
              onPress={() => void runSearch()}
              disabled={!canSearch}
              loading={shoppingPlan.isPending}
              style={styles.searchButton}
            >
              Buscar precios
            </Button>
          </CardContent>
        </Card>

        <CatalogModal
          visible={showCatalog}
          addedTerms={addedTerms}
          onClose={() => setShowCatalog(false)}
          onToggleItem={toggleItemFromCatalog}
        />

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
              <View key={cart.storeName}>
                <StoreCartCard
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
                <Button
                  variant="outline"
                  size="sm"
                  style={styles.registerExpenseBtn}
                  onPress={() =>
                    router.push({
                      pathname: "/(app)/new-expense",
                      params: {
                        prefillTitle: cart.storeName,
                        prefillAmount: String(Math.round(cart.totalPrice)),
                        prefillCategory: "GROCERIES",
                      },
                    })
                  }
                >
                  <Receipt size={13} color={colors.mutedForeground} />
                  Registrar gasto
                </Button>
                {index === 0 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    style={styles.shareCartBtn}
                    onPress={() => {
                      const productLines = cart.products
                        .filter((p) => p.isAdded && !p.isOutOfStock)
                        .slice(0, 5)
                        .map(
                          (p) =>
                            `• ${p.productName}: $${p.price.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`,
                        );
                      const extraCount =
                        cart.products.filter((p) => p.isAdded && !p.isOutOfStock).length - 5;
                      const lines = [
                        `Compré en ${cart.storeName} con Habita:`,
                        "",
                        ...productLines,
                        ...(extraCount > 0 ? [`... y ${extraCount} más`] : []),
                        "",
                        `Total: $${cart.totalPrice.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`,
                        "",
                        "Comparador de precios 🏠 Habita",
                      ];
                      void Share.share({ message: lines.join("\n") }).catch(() => undefined);
                    }}
                  >
                    <Share2 size={13} color={colors.mutedForeground} />
                    Compartir
                  </Button>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {adjustedCarts.length === 0 && !shoppingPlan.isPending ? (
          <EmptyState
            icon={<ShoppingCart size={32} color={colors.mutedForeground} />}
            title="Empezá a comparar"
            subtitle="Agregá productos y compará precios entre supermercados"
            steps={[
              { label: "Agregá productos a tu lista" },
              { label: "Tocá 'Buscar precios' para comparar" },
              { label: "Elegí el carrito más conveniente" },
            ]}
          />
        ) : null}
          </>
        ) : null}

        {activeSection === "promos" ? (
          <PromosSection
            promos={allPromos}
            isLoading={promosQuery.isPending}
            isRunning={pipelineStatus.data?.isRunning ?? false}
            onRefresh={() => refreshPromos.mutate()}
            isRefreshing={refreshPromos.isPending}
          />
        ) : null}

        {activeSection === "saved" ? (
          savedCarts.length > 0 ? (
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
                            setActiveSection("search");
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
                          variant="outline"
                          size="sm"
                          onPress={() =>
                            router.push({
                              pathname: "/(app)/new-expense",
                              params: {
                                prefillTitle: adapted.storeName,
                                prefillAmount: String(Math.round(adapted.totalPrice)),
                                prefillCategory: "GROCERIES",
                              },
                            })
                          }
                        >
                          <Receipt size={13} color={colors.mutedForeground} />
                          Registrar gasto
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
          ) : (
            <EmptyState
              icon={<Bookmark size={32} color={colors.mutedForeground} />}
              title="Sin carritos guardados"
              subtitle="Buscá precios y guardá tus carritos favoritos"
            />
          )
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
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
      color: c.text,
    },
    subtitle: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      color: c.mutedForeground,
      marginBottom: spacing.sm,
    },
    sectionTabs: {
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
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    catalogBanner: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.sm,
      marginTop: spacing.md,
      padding: spacing.md,
      borderRadius: radius.xl,
      backgroundColor: `${c.primary}10`,
    },
    catalogBannerIcon: {
      width: 32,
      height: 32,
      borderRadius: radius.md,
      backgroundColor: `${c.primary}18`,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    catalogBannerContent: {
      flex: 1,
    },
    catalogBannerTitle: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      fontWeight: "600" as const,
      color: c.text,
    },
    catalogBannerCount: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      color: c.mutedForeground,
      marginTop: 1,
    },
    searchButton: {
      marginTop: spacing.sm,
    },
    /* --- Catalog modal --- */
    catalogModalContainer: {
      flex: 1,
      backgroundColor: c.background,
    },
    catalogModalHeader: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    catalogModalTitle: {
      fontFamily: fontFamily.sans,
      fontSize: 17,
      fontWeight: "700" as const,
      color: c.text,
    },
    catalogConfirmBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: radius.full,
      backgroundColor: c.primary,
    },
    catalogConfirmText: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      fontWeight: "700" as const,
      color: "#ffffff",
    },
    catalogSearchRow: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    catalogSearchInput: {
      flex: 1,
    },
    catalogModalLoading: {
      flex: 1,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    catalogModalScroll: {
      flex: 1,
    },
    catalogModalContent: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      gap: spacing.lg,
    },
    catalogCategory: {
      gap: spacing.xs,
    },
    catalogCategoryLabel: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      fontWeight: "600" as const,
      color: c.mutedForeground,
      textTransform: "uppercase" as const,
      letterSpacing: 0.5,
    },
    catalogChipRow: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: spacing.xs,
    },
    catalogChip: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radius.full,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    catalogChipAdded: {
      borderColor: c.primary,
      backgroundColor: `${c.primary}15`,
    },
    catalogChipText: {
      fontFamily: fontFamily.sans,
      fontSize: 13,
      color: c.text,
    },
    catalogChipTextAdded: {
      color: c.primary,
      fontWeight: "600" as const,
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
      color: c.text,
      marginBottom: spacing.xs,
    },
    sectionSubtitle: {
      fontFamily: fontFamily.sans,
      fontSize: 13,
      color: c.mutedForeground,
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
      color: c.text,
    },
    storeCardSub: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      color: c.mutedForeground,
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
      color: c.text,
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
      backgroundColor: c.background,
      borderRadius: 10,
      padding: spacing.sm,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: c.border,
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
      color: c.text,
    },
    productRowName: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      color: c.mutedForeground,
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
      color: c.text,
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
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
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
      color: c.text,
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
      color: c.text,
      minWidth: 18,
      textAlign: "center",
    },
    chipQtyBtn: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: c.background,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    chipRemoveBtn: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: c.destructiveForeground,
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
      color: c.text,
    },
    savedCartSub: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      color: c.mutedForeground,
      marginTop: 2,
    },
    savedCartTotal: {
      fontFamily: fontFamily.sans,
      fontSize: 17,
      fontWeight: "800",
      color: c.text,
    },
    registerExpenseBtn: {
      alignSelf: "flex-end" as const,
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
    },
    shareCartBtn: {
      alignSelf: "flex-end" as const,
      marginTop: spacing.xs,
      marginBottom: spacing.xs,
    },
    savedCartActions: {
      flexDirection: "row",
      gap: spacing.sm,
      flexWrap: "wrap",
    },
    /* --- Winner highlighting (C3) --- */
    storeCardWinner: {
      borderColor: c.primary,
      borderWidth: 2,
      overflow: "hidden" as const,
    },
    winnerAccent: {
      position: "absolute" as const,
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
      backgroundColor: c.primary,
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
      color: c.mutedForeground,
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
      color: c.text,
      minWidth: 20,
      textAlign: "center" as const,
    },
    iconActionBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
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
      color: c.mutedForeground,
      marginTop: 2,
    },
    productRowQty: {
      fontFamily: fontFamily.sans,
      fontSize: 11,
      color: c.mutedForeground,
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
      color: c.primary,
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
      color: c.primary,
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
      backgroundColor: c.card,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
    },
    alternativeItemName: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      color: c.text,
      flex: 1,
      marginRight: spacing.sm,
    },
    alternativeItemPrice: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      fontWeight: "700" as const,
      color: c.text,
    },
    alternativeItemPriceCheaper: {
      color: "#059669",
    },
    /* --- Promo banner (C1) --- */
    promoBanner: {
      marginTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingTop: spacing.sm,
    },
    promoBannerToggle: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: radius.md,
      backgroundColor: `${c.muted}80`,
    },
    promoBannerToggleActive: {
      backgroundColor: `${c.primary}15`,
    },
    promoBannerTitle: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      fontWeight: "600" as const,
      color: c.mutedForeground,
      flex: 1,
    },
    promoBannerTitleActive: {
      color: c.primary,
    },
    promoList: {
      marginTop: spacing.xs,
      gap: 4,
      backgroundColor: `${c.muted}40`,
      borderRadius: radius.md,
      padding: spacing.xs,
    },
    promoItem: {
      borderRadius: radius.md,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    promoItemSelected: {
      backgroundColor: `${c.primary}12`,
    },
    promoItemRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.sm,
    },
    promoDiscountBadge: {
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 3,
      backgroundColor: "#dcfce7",
    },
    promoDiscountBadgeActive: {
      backgroundColor: c.primary,
    },
    promoDiscountText: {
      fontFamily: fontFamily.sans,
      fontSize: 11,
      fontWeight: "700" as const,
      color: "#166534",
    },
    promoDiscountTextActive: {
      color: "#ffffff",
    },
    promoItemBody: {
      flex: 1,
      minWidth: 0,
    },
    promoBank: {
      fontFamily: fontFamily.sans,
      fontSize: 13,
      fontWeight: "600" as const,
      color: c.text,
    },
    promoBankActive: {
      color: c.primary,
    },
    promoMeta: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      marginTop: 1,
    },
    promoDays: {
      fontFamily: fontFamily.sans,
      fontSize: 11,
      color: c.mutedForeground,
    },
    promoExtraHint: {
      marginTop: 4,
      paddingHorizontal: 10,
    },
    promoExtraHintText: {
      fontFamily: fontFamily.sans,
      fontSize: 11,
      color: c.primary,
    },
  });
}

// ── Promos Section styles ─────────────────────────────────────────────────────

function createPromoStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      gap: spacing.md,
    },
    loadingContainer: {
      paddingVertical: spacing.xl * 2,
      alignItems: "center",
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    pipelineBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: `${c.primary}10`,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: `${c.primary}30`,
    },
    pipelineText: {
      fontFamily: fontFamily.sans,
      fontSize: 13,
      color: c.primary,
      fontWeight: "500",
    },
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    searchInput: {
      flex: 1,
    },
    storeCard: {
      overflow: "hidden" as const,
    },
    storeHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      padding: spacing.md,
    },
    storeMeta: {
      flex: 1,
      minWidth: 0,
    },
    storeName: {
      fontFamily: fontFamily.sans,
      fontSize: 15,
      fontWeight: "700",
      color: c.text,
    },
    storeSub: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      color: c.mutedForeground,
      marginTop: 2,
    },
    bestBadge: {
      backgroundColor: "#dcfce7",
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    bestBadgeText: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      fontWeight: "700",
      color: "#166534",
    },
    promoList: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      gap: 6,
    },
    promoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: 6,
      paddingHorizontal: spacing.sm,
      backgroundColor: `${c.muted}40`,
      borderRadius: radius.md,
    },
    discountBadge: {
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 3,
      backgroundColor: "#dcfce7",
    },
    discountBadgeActive: {
      backgroundColor: c.primary,
    },
    discountText: {
      fontFamily: fontFamily.sans,
      fontSize: 11,
      fontWeight: "700",
      color: "#166534",
    },
    discountTextActive: {
      color: "#ffffff",
    },
    promoBody: {
      flex: 1,
      minWidth: 0,
    },
    promoBank: {
      fontFamily: fontFamily.sans,
      fontSize: 13,
      fontWeight: "600",
      color: c.text,
    },
    promoMetaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: 1,
    },
    promoMetaText: {
      fontFamily: fontFamily.sans,
      fontSize: 11,
      color: c.mutedForeground,
    },
    extraHint: {
      fontFamily: fontFamily.sans,
      fontSize: 11,
      color: c.primary,
      paddingHorizontal: spacing.sm,
      paddingTop: 2,
    },
  });
}
