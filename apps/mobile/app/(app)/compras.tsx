import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Image, Linking, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
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
  MapPin,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  ArrowDownRight,
  BarChart3,
  Pin,
  Trash2,
  Trophy,
  Undo2,
  X,
  Share2,
} from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useDeleteSavedCart, useRefreshSavedCart, useSaveCart, useSavedCarts } from "@/hooks/use-saved-carts";
import { useProductCatalog, useShoppingPlan } from "@/hooks/use-shopping-plan";
import { useAiJobStatus } from "@/hooks/use-ai-job-status";
import { mobileApi } from "@/lib/api";
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
  ShoppingPlanResult,
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

// ── Collapsible chip list (max 2 rows) ───────────────────────────────────────

interface CollapsibleChipListProps {
  items: SearchItem[];
  onRemove: (term: string) => void;
}

function CollapsibleChipList({ items, onRemove }: CollapsibleChipListProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [expanded, setExpanded] = useState(false);
  const [hiddenCount, setHiddenCount] = useState(0);
  const chipYMap = useRef<Map<string, number>>(new Map());
  const measured = useRef(false);

  const itemsKey = items.map((i) => i.term).join(",");
  useEffect(() => {
    chipYMap.current.clear();
    measured.current = false;
    setHiddenCount(0);
    setExpanded(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey]);

  const tryFinalizeMeasurement = useCallback(() => {
    if (measured.current || chipYMap.current.size < items.length) return;
    measured.current = true;
    const ys = [...chipYMap.current.values()].sort((a, b) => a - b);
    const row2Start = ys.find((y) => y > 4) ?? null;
    if (row2Start === null) return;
    const row3Start = ys.find((y) => y > row2Start + 4) ?? null;
    if (row3Start === null) return;
    const hidden = ys.filter((y) => y >= row3Start - 2).length;
    if (hidden > 0) setHiddenCount(hidden);
  }, [items.length]);

  const visibleItems = useMemo(() => {
    if (expanded || hiddenCount === 0) return items;
    return items.slice(0, items.length - hiddenCount);
  }, [items, expanded, hiddenCount]);

  if (items.length === 0) return null;

  return (
    <View style={styles.itemsList}>
      {/* Invisible measurement clone — absolute so it doesn't affect layout */}
      <View
        pointerEvents="none"
        style={{ position: "absolute", opacity: 0, flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, width: "100%" }}
      >
        {items.map((item) => (
          <View
            key={`m-${item.term}`}
            onLayout={(e) => {
              chipYMap.current.set(item.term, e.nativeEvent.layout.y);
              tryFinalizeMeasurement();
            }}
          >
            <SimpleItemChip item={item} onRemove={() => {}} />
          </View>
        ))}
      </View>

      {/* Visible chips */}
      {visibleItems.map((item) => (
        <SimpleItemChip key={item.term} item={item} onRemove={() => onRemove(item.term)} />
      ))}

      {/* Expand button */}
      {hiddenCount > 0 && !expanded && (
        <Pressable onPress={() => setExpanded(true)} style={styles.expandChipsBtn} hitSlop={8}>
          <Plus size={12} color={colors.primary} />
          <Text style={styles.expandChipsBtnText}>
            {hiddenCount} producto{hiddenCount !== 1 ? "s" : ""} más
          </Text>
        </Pressable>
      )}
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
  initialCategory?: string | null;
  onClose: () => void;
  onToggleItem: (name: string) => void;
}

function CatalogModal({ visible, addedTerms, initialCategory, onClose, onToggleItem }: CatalogModalProps) {
  const catalog = useProductCatalog();
  const [search, setSearch] = useState("");
  const products = catalog.data?.products ?? [];
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scrollRef = useRef<ScrollView>(null);
  const categoryOffsets = useRef<Map<string, number>>(new Map());

  // Auto-scroll to initialCategory when modal opens
  useEffect(() => {
    if (visible && initialCategory && categoryOffsets.current.size > 0) {
      const offset = categoryOffsets.current.get(initialCategory);
      if (offset != null) {
        scrollRef.current?.scrollTo({ y: offset, animated: true });
      }
    }
  }, [visible, initialCategory]);

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
            ref={scrollRef}
            style={styles.catalogModalScroll}
            contentContainerStyle={styles.catalogModalContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {[...filteredGroups.entries()].map(([category, items]) => (
              <View
                key={category}
                style={styles.catalogCategory}
                onLayout={(e) => categoryOffsets.current.set(category, e.nativeEvent.layout.y)}
              >
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
  onSetOverride: (storeName: string, searchTerm: string, update: Partial<ProductOverride>) => void;
}

function ProductRow({
  product,
  storeName,
  onSetOverride,
}: ProductRowProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [showAlternatives, setShowAlternatives] = useState(false);
  const hasAlternatives = product.alternatives.length > 0;
  const cheaperAlt = product.alternatives.find(
    (alt) => alt.price < product.price,
  );

  return (
    <View style={styles.productRow}>
      {/* Header: name + unit + price + link */}
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
        </View>
        <View style={styles.productRowPrice}>
          {product.quantity > 1 ? (
            <Text style={styles.productRowQty}>x{product.quantity}</Text>
          ) : null}
          <Text style={[styles.productRowAmount, product.isCheapest && styles.productRowAmountCheapest]}>
            {formatAmount(product.lineTotal)}
          </Text>
          {product.link ? (
            <Pressable
              onPress={() => {
                if (product.link) {
                  void Linking.openURL(product.link);
                }
              }}
              hitSlop={8}
            >
              <ExternalLink size={14} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Cheaper alternative inline suggestion */}
      {cheaperAlt ? (
        <Pressable
          onPress={() => onSetOverride(storeName, product.searchTerm, { replacement: cheaperAlt })}
          style={styles.cheaperAltBtn}
        >
          <ArrowDownRight size={12} color="#059669" />
          <Text style={styles.cheaperAltName} numberOfLines={1}>
            {cheaperAlt.productName}
          </Text>
          <Text style={styles.cheaperAltPrice}>
            {formatAmount(cheaperAlt.price * product.quantity)}
          </Text>
        </Pressable>
      ) : null}

      {/* Collapsible alternatives */}
      {hasAlternatives && product.alternatives.length > (cheaperAlt ? 1 : 0) ? (
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
              {product.alternatives.length - (cheaperAlt ? 1 : 0)} alternativa{(product.alternatives.length - (cheaperAlt ? 1 : 0)) !== 1 ? "s" : ""}
            </Text>
          </Pressable>
          {showAlternatives ? (
            <View style={styles.alternativesList}>
              {product.alternatives
                .filter((a) => a.link !== cheaperAlt?.link)
                .map((alt) => (
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
    </View>
  );
}

// ── Promo scoring helpers (mirrors src/lib/promos/scoring.ts) ───────────────

const DAY_INDEX_TO_NAME: Record<number, string> = {
  0: "domingo", 1: "lunes", 2: "martes", 3: "miércoles",
  4: "jueves", 5: "viernes", 6: "sábado",
};

const DAY_SHORT: Record<string, string> = {
  lunes: "Lun", martes: "Mar", "miércoles": "Mié",
  jueves: "Jue", viernes: "Vie", "sábado": "Sáb", domingo: "Dom",
};

function getTodayDayName(): string {
  return DAY_INDEX_TO_NAME[new Date().getDay()] ?? "lunes";
}

/** Normalize a day name to lowercase + canonical accents. */
function normalizeDay(day: string): string {
  const lower = day.toLowerCase().trim();
  switch (lower) {
    case "miercoles": return "miércoles";
    case "sabado":    return "sábado";
    default:          return lower;
  }
}

/** Check if a promo is expired (validUntil < today). */
function isPromoExpired(promo: BankPromo): boolean {
  if (!promo.validUntil) return false;
  const expiry = new Date(promo.validUntil);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return expiry < today;
}

/** Check if a promo applies on a given day (case-insensitive, accent-tolerant). */
function promoAppliesToday(promo: BankPromo, todayDayName: string): boolean {
  const days = parseJsonArray(promo.daysOfWeek);
  if (days.length === 0) return true;
  const normalizedToday = normalizeDay(todayDayName);
  return days.some((d) => normalizeDay(d) === normalizedToday);
}

function scorePromo(promo: BankPromo, todayName: string): number {
  if (isPromoExpired(promo)) return 0;
  let score = promo.discountPercent;
  if (!promo.capAmount) score += 5;
  if (promoAppliesToday(promo, todayName)) score += 10;
  return score;
}

function formatDaysShort(daysOfWeekJson: string): string {
  const days = parseJsonArray(daysOfWeekJson);
  if (days.length === 0 || days.length === 7) return "Todos los días";
  return days.map((d) => DAY_SHORT[normalizeDay(d)] ?? d).join(", ");
}

/** Best promo per bank sorted by score (expired promos excluded). */
function getBestPromosByBank(promos: BankPromo[], todayName: string): BankPromo[] {
  const active = promos.filter((p) => !isPromoExpired(p));
  const bankMap = new Map<string, BankPromo>();
  for (const promo of active) {
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

  // All promos sorted by score, expired filtered out (shown when expanded)
  const allSorted = promos.filter((p) => !isPromoExpired(p)).sort((a, b) => scorePromo(b, todayName) - scorePromo(a, todayName));
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
            const daysLabel = days.length > 0 ? days.map((d) => DAY_SHORT[normalizeDay(d)] ?? d).join(", ") : "Todos los días";
            const appliesToday = promoAppliesToday(promo, todayName);
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
                    <View style={styles.promoMeta}>
                      <Text style={[styles.promoBank, isSelected && styles.promoBankActive]}>
                        {promo.bankDisplayName}
                      </Text>
                      {appliesToday ? (
                        <Badge variant="success" size="sm">Hoy</Badge>
                      ) : null}
                    </View>
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

// ── Comparison summary (ported from web grocery-advisor.tsx) ─────────────────

function buildComparisonSummary(carts: AdjustedStoreCart[]): string | null {
  if (carts.length < 2) return null;

  const winner = carts[0]!;
  const runnerUp = carts[1]!;
  const worst = carts[carts.length - 1]!;
  const savingsVsSecond = Math.round(runnerUp.totalPrice - winner.totalPrice);
  const savingsVsWorst = Math.round(worst.totalPrice - winner.totalPrice);
  const pctVsSecond = Math.round((savingsVsSecond / runnerUp.totalPrice) * 100);

  const lines: string[] = [];

  lines.push(
    `${winner.storeName} es la opción más barata con un total de ${formatAmount(winner.totalPrice)}, ` +
    `${formatAmount(savingsVsSecond)} menos que ${runnerUp.storeName} (${pctVsSecond}% de ahorro).`,
  );

  if (carts.length > 2) {
    lines.push(
      `La diferencia entre el más barato y el más caro (${worst.storeName}, ${formatAmount(worst.totalPrice)}) ` +
      `es de ${formatAmount(savingsVsWorst)}.`,
    );
  }

  const storesWithCheapest = carts.filter((c) => c.cheapestCount > 0);
  if (storesWithCheapest.length > 0) {
    const cheapestBreakdown = storesWithCheapest
      .map((c) => `${c.storeName} (${c.cheapestCount})`)
      .join(", ");
    lines.push(`Productos al mejor precio por supermercado: ${cheapestBreakdown}.`);
  }

  const storesWithMissing = carts.filter((c) => c.missingTerms.length > 0);
  if (storesWithMissing.length > 0) {
    const missingNote = storesWithMissing
      .map((c) => `${c.storeName} (${c.missingTerms.length})`)
      .join(", ");
    lines.push(`Productos no encontrados: ${missingNote}. Tené en cuenta que un total más bajo puede deberse a que faltan productos.`);
  }

  return lines.join("\n\n");
}

// ── StoreCartCard ──────────────────────────────────────────────────────────────

interface StoreCartCardProps {
  cart: AdjustedStoreCart;
  rank: number;
  isSaved: boolean;
  isPinned?: boolean;
  promos: BankPromo[];
  userCoords?: { lat: number; lng: number };
  onToggleSave: (cart: AdjustedStoreCart) => void;
  onPinStore?: () => void;
  onSetOverride: (storeName: string, searchTerm: string, update: Partial<ProductOverride>) => void;
}

function StoreCartCard({
  cart,
  rank,
  isSaved,
  isPinned,
  promos,
  userCoords,
  onToggleSave,
  onPinStore,
  onSetOverride,
}: StoreCartCardProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [selectedPromo, setSelectedPromo] = useState<BankPromo | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const isWinner = rank === 0;

  const mapsUrl = useMemo(() => {
    const q = encodeURIComponent(cart.storeName);
    if (userCoords) {
      return `https://www.google.com/maps/dir/?api=1&origin=${userCoords.lat},${userCoords.lng}&destination=${q}&travelmode=driving`;
    }
    return `https://www.google.com/maps/search/${q}`;
  }, [cart.storeName, userCoords]);

  // Calculate discounted total
  const baseTotal = cart.totalPrice;
  let discountedTotal = baseTotal;
  if (selectedPromo) {
    const discount = baseTotal * (selectedPromo.discountPercent / 100);
    const cappedDiscount = selectedPromo.capAmount ? Math.min(discount, selectedPromo.capAmount) : discount;
    discountedTotal = baseTotal - cappedDiscount;
  }

  // Cart-level savings vs market average
  const productsWithAvg = cart.products.filter((p) => p.averagePrice != null);
  const avgTotal = productsWithAvg.reduce((sum, p) => sum + ((p.averagePrice ?? 0) * p.quantity), 0);
  const actualTotal = productsWithAvg.reduce((sum, p) => sum + p.lineTotal, 0);
  const savingsAmount = avgTotal > 0 ? Math.round(avgTotal - actualTotal) : 0;
  const savingsPercent = avgTotal > 0 ? Math.round((1 - actualTotal / avgTotal) * 100) : null;

  return (
    <Card style={[styles.storeCard, isWinner && styles.storeCardWinner]}>
      {isWinner ? <View style={styles.winnerAccent} /> : null}
      <CardContent>
        {/* Header */}
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
                <Pressable
                  onPress={() => {
                    void Linking.openURL(mapsUrl);
                  }}
                  style={styles.mapsLink}
                  hitSlop={8}
                >
                  <MapPin size={11} color={colors.primary} />
                  <Text style={styles.mapsLinkText}>Cómo llegar</Text>
                </Pressable>
              </View>
              <Text style={styles.storeCardSub}>
                {cart.products.length} de {cart.totalSearched} producto{cart.totalSearched !== 1 ? "s" : ""}
                {cart.cheapestCount > 0 ? (
                  <Text style={styles.cheapestCountText}> · {cart.cheapestCount} al mejor precio</Text>
                ) : null}
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
              <>
                <Text style={[styles.storeCardTotal, (isWinner || isPinned) && { color: colors.primary }]}>
                  {formatAmount(baseTotal)}
                </Text>
                {savingsPercent != null && savingsPercent !== 0 ? (
                  <Text style={[styles.savingsHintText, savingsPercent < 0 && styles.savingsHintTextNeg]}>
                    {savingsPercent > 0 ? `${savingsPercent}% menos` : `+${Math.abs(savingsPercent)}% vs prom.`}
                  </Text>
                ) : null}
              </>
            )}
            <View style={styles.headerActions}>
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
              <Pressable
                onPress={() => setIsOpen((v) => !v)}
                hitSlop={8}
              >
                <View style={isOpen ? { transform: [{ rotate: "180deg" }] } : undefined}>
                  <ChevronDown size={18} color={colors.mutedForeground} />
                </View>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Promo banner */}
        <StorePromoBanner
          promos={promos}
          onSelectPromo={setSelectedPromo}
          selectedPromoId={selectedPromo?.id ?? null}
        />

        {/* Product list (collapsible) */}
        {isOpen ? (
          <View style={styles.productListSection}>
            {cart.products.map((product) => (
              <ProductRow
                key={`${cart.storeName}-${product.searchTerm}`}
                product={product}
                storeName={cart.storeName}
                onSetOverride={onSetOverride}
              />
            ))}

            {/* Price disclaimer */}
            <Text style={styles.priceDisclaimer}>
              * Los precios pueden variar al momento de la compra.
            </Text>
          </View>
        ) : null}

        {/* Missing products */}
        {cart.missingTerms.length > 0 ? (
          <View style={styles.missingBanner}>
            <Text style={styles.missingTitle}>No encontrado</Text>
            <Text style={styles.missingText}>{cart.missingTerms.join(", ")}</Text>
          </View>
        ) : null}

        {/* Savings footer */}
        {savingsAmount > 0 && isWinner ? (
          <View style={styles.savingsFooter}>
            <Text style={styles.savingsText}>
              Ahorrás {formatAmount(savingsAmount)} comprando acá vs el promedio del mercado
            </Text>
          </View>
        ) : null}

        {/* Share + Pin row */}
        <View style={styles.cardActionsRow}>
          <Pressable
            onPress={() => {
              const today = new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long" });
              const productLines = cart.products.map((p) => {
                const qty = p.quantity > 1 ? ` x${p.quantity}` : "";
                return `• ${p.productName}${qty} — ${formatAmount(p.lineTotal)}`;
              });
              const lines = [
                `🛒 *Lista ${cart.storeName}* — ${today}`,
                "",
                ...productLines,
                "",
                `*Total: ${formatAmount(cart.totalPrice)}*`,
                "",
                "_Generado con Habita_",
              ];
              void Share.share({ message: lines.join("\n") }).catch(() => undefined);
            }}
            style={styles.shareListBtn}
          >
            <Share2 size={14} color={colors.primary} />
            <Text style={styles.shareListBtnText}>Compartir lista</Text>
          </Pressable>
          {onPinStore ? (
            <Pressable onPress={onPinStore} style={[styles.pinStoreBtn, isPinned && styles.pinStoreBtnActive]}>
              <Pin size={14} color={isPinned ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.pinStoreText, isPinned && styles.pinStoreTextActive]}>
                {isPinned ? "Fijado" : "Elegir este super"}
              </Text>
            </Pressable>
          ) : null}
        </View>
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

/** Group promos by storeName, then within each store pick the best per bank. Expired promos excluded. */
function groupPromosByStore(promos: BankPromo[], todayName: string) {
  const storeMap = new Map<string, BankPromo[]>();
  for (const promo of promos.filter((p) => !isPromoExpired(p))) {
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
                      ? days.map((d) => DAY_SHORT[normalizeDay(d)] ?? d).join(", ")
                      : "Todos los días";
                    const isToday = promoAppliesToday(promo, todayName);
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

// ── Quick-category pills ─────────────────────────────────────────────────────

// ── Payment method picker ────────────────────────────────────────────────────

const PAYMENT_METHOD_OPTIONS: { bankSlug: string; label: string }[] = [
  { bankSlug: "mercadopago", label: "Mercado Pago" },
  { bankSlug: "naranjax", label: "Naranja X" },
  { bankSlug: "modo", label: "MODO" },
  { bankSlug: "uala", label: "Ualá" },
  { bankSlug: "personalpay", label: "Personal Pay" },
  { bankSlug: "cuentadni", label: "Cuenta DNI" },
  { bankSlug: "galicia", label: "Galicia" },
  { bankSlug: "santander", label: "Santander" },
  { bankSlug: "bbva", label: "BBVA" },
  { bankSlug: "macro", label: "Macro" },
  { bankSlug: "nacion", label: "Nación" },
  { bankSlug: "patagonia", label: "Patagonia" },
  { bankSlug: "ciudad", label: "Ciudad" },
  { bankSlug: "provincia", label: "Provincia" },
  { bankSlug: "icbc", label: "ICBC" },
  { bankSlug: "supervielle", label: "Supervielle" },
  { bankSlug: "credicoop", label: "Credicoop" },
  { bankSlug: "brubank", label: "Brubank" },
];

function PaymentMethodPicker({
  selectedSlugs,
  onToggle,
}: {
  selectedSlugs: string[];
  onToggle: (slug: string) => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.bankPickerContainer}>
      <Text style={styles.bankPickerLabel}>
        <CreditCard size={13} color={colors.mutedForeground} />{" "}
        Tus bancos y billeteras
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.bankPickerScroll}
      >
        {PAYMENT_METHOD_OPTIONS.map((opt) => {
          const isSelected = selectedSlugs.includes(opt.bankSlug);
          return (
            <Pressable
              key={opt.bankSlug}
              onPress={() => onToggle(opt.bankSlug)}
              style={[styles.bankChip, isSelected && styles.bankChipSelected]}
            >
              <Text style={[styles.bankChipText, isSelected && styles.bankChipTextSelected]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function ShoppingPlanScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Geolocation (once on mount, for "Cómo llegar" links)
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    // expo provides navigator.geolocation polyfill
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}, // silently ignore errors
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }, []);

  const searchMilestone = useMilestone("first-search");
  const { celebrate } = useCelebration();
  const ahorraWasToured = useSectionToured("ahorra");
  const shoppingPlan = useShoppingPlan();
  // Shopping results from background job
  const [shoppingResult, setShoppingResult] = useState<ShoppingPlanResult | null>(null);
  const { isRunning: isShoppingJobRunning, refetchStatus: refetchShoppingStatus } = useAiJobStatus({
    jobType: "SHOPPING_PLAN",
    onComplete: async (jobId) => {
      try {
        const result = await mobileApi.get<{ resultData: ShoppingPlanResult }>(
          `/api/ai/job-result/${jobId}`,
        );
        setShoppingResult(result.resultData);
      } catch {
        setLocalError("Error al obtener los resultados");
      }
    },
    onError: (errorMessage) => {
      setLocalError(errorMessage ?? "Error al buscar precios");
    },
  });
  const catalog = useProductCatalog();
  // alternativesSearch removed — simplified product rows no longer need it
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

  // Payment method picker (persisted)
  const [selectedBankSlugs, setSelectedBankSlugs] = useState<string[]>([]);
  useEffect(() => {
    void AsyncStorage.getItem("habita_mobile_payment_methods").then((raw) => {
      if (!raw) return;
      try {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) setSelectedBankSlugs(parsed.filter((s): s is string => typeof s === "string"));
      } catch { /* ignore */ }
    });
  }, []);
  const toggleBankSlug = useCallback((slug: string) => {
    setSelectedBankSlugs((prev) => {
      const next = prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug];
      void AsyncStorage.setItem("habita_mobile_payment_methods", JSON.stringify(next));
      return next;
    });
  }, []);

  const [activeSection, setActiveSection] = useState<"search" | "promos" | "saved">("search");
  const [termInput, setTermInput] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [lastSearchedTerms, setLastSearchedTerms] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<Map<string, ProductOverride>>(new Map());
  // replaceKey/replaceQuery/replaceOptions removed — simplified product rows
  const [localError, setLocalError] = useState<string | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);
  const [clearUndoSnapshot, setClearUndoSnapshot] = useState<SearchItem[] | null>(null);
  const [pinnedStore, setPinnedStore] = useState<string | null>(null);
  const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set());
  const [showComparison, setShowComparison] = useState(false);
  const [catalogInitialCategory, setCatalogInitialCategory] = useState<string | null>(null);
  const [quickAddTerm, setQuickAddTerm] = useState("");

  // Handle addTerms from grocery-deals top offers
  const params = useLocalSearchParams<{ addTerms?: string }>();
  const addTermsProcessed = useRef(false);
  useEffect(() => {
    if (params.addTerms && !addTermsProcessed.current) {
      addTermsProcessed.current = true;
      try {
        const terms = JSON.parse(params.addTerms) as unknown;
        if (Array.isArray(terms)) {
          setItems((prev) => {
            const existing = new Set(prev.map((i) => i.term.toLowerCase()));
            const newItems = terms
              .filter((t): t is string => typeof t === "string" && t.trim().length >= 2)
              .filter((t) => !existing.has(t.toLowerCase()))
              .map((t) => ({ term: t.trim(), quantity: 1 }));
            return [...prev, ...newItems];
          });
        }
      } catch {
        // Invalid JSON — ignore
      }
    }
  }, [params.addTerms]);

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

  const canSearch = items.length > 0 && !(shoppingPlan.isPending || isShoppingJobRunning);

  const hasResults = (shoppingResult?.storeCarts?.length ?? 0) > 0;

  const newItems = useMemo(() => {
    if (!hasResults || lastSearchedTerms.size === 0) return [];
    return items.filter((i) => !lastSearchedTerms.has(i.term.toLowerCase()));
  }, [items, lastSearchedTerms, hasResults]);

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
    const source = shoppingResult?.storeCarts ?? [];

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
    carts.sort((a, b) => a.totalPrice - b.totalPrice);

    // Pinned store to top
    if (pinnedStore) {
      carts.sort((a, b) => {
        if (a.storeName === pinnedStore) return -1;
        if (b.storeName === pinnedStore) return 1;
        return 0;
      });
    }

    return carts;
  }, [shoppingResult?.storeCarts, overrides, quantityByTerm, pinnedStore]);

  const toggleStore = (storeName: string) => {
    setSelectedStores((prev) => {
      const next = new Set(prev);
      if (next.has(storeName)) next.delete(storeName);
      else next.add(storeName);
      return next;
    });
  };

  const filteredCarts = useMemo(() => {
    if (selectedStores.size === 0) return adjustedCarts;
    return adjustedCarts.filter((c) => selectedStores.has(c.storeName));
  }, [adjustedCarts, selectedStores]);

  const comparisonSummary = useMemo(
    () => buildComparisonSummary(filteredCarts),
    [filteredCarts],
  );

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

  const removeItem = (term: string) => {
    setItems((previous) => previous.filter((item) => item.term !== term));
  };

  const clearAllItems = () => {
    setClearUndoSnapshot([...items]);
    setItems([]);
  };

  const undoClearItems = () => {
    if (!clearUndoSnapshot) return;
    setItems(clearUndoSnapshot);
    setClearUndoSnapshot(null);
  };

  const runSearch = async () => {
    setLocalError(null);
    setShoppingResult(null);
    try {
      await shoppingPlan.mutateAsync({ searchItems: items });
      setLastSearchedTerms(new Set(items.map((i) => i.term.toLowerCase())));
      void AsyncStorage.setItem("habita_shopping_first_search", "1");
      const wasFirst = await searchMilestone.complete();
      if (wasFirst) celebrate("first-search");
      setOverrides(new Map());
      setSelectedStores(new Set());
      setPinnedStore(null);
      setShowComparison(false);
      // Trigger polling for job completion
      await refetchShoppingStatus();
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

            <CollapsibleChipList items={items} onRemove={removeItem} />

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
              loading={(shoppingPlan.isPending || isShoppingJobRunning)}
              style={styles.searchButton}
            >
              {hasResults && newItems.length > 0
                ? <RefreshCw size={16} color="#ffffff" />
                : <Search size={16} color="#ffffff" />
              }
              {hasResults && newItems.length > 0 ? "Actualizar búsqueda" : "Buscar precios"}
            </Button>
            {items.length > 0 && !clearUndoSnapshot ? (
              <Pressable onPress={clearAllItems} style={styles.clearAllBtn} hitSlop={8}>
                <Text style={styles.clearAllText}>Limpiar todo</Text>
              </Pressable>
            ) : null}
            {clearUndoSnapshot ? (
              <Pressable onPress={undoClearItems} style={styles.undoBtn} hitSlop={8}>
                <Undo2 size={12} color={colors.mutedForeground} />
                <Text style={styles.undoText}>Deshacer</Text>
              </Pressable>
            ) : null}
            {/* Store logos strip */}
            <View style={styles.storeLogosStrip}>
              <Text style={styles.storeLogosLabel}>Buscamos en</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storeLogosScroll}>
                {Object.keys(storeColors).map((name) => (
                  <StoreAvatar key={name} storeName={name} size={22} />
                ))}
              </ScrollView>
            </View>
          </CardContent>
        </Card>

        <CatalogModal
          visible={showCatalog}
          addedTerms={addedTerms}
          initialCategory={catalogInitialCategory}
          onClose={() => { setShowCatalog(false); setCatalogInitialCategory(null); }}
          onToggleItem={toggleItemFromCatalog}
        />

        {localError ? (
          <Card style={styles.errorCard}>
            <CardContent>
              <Text style={styles.errorText}>{localError}</Text>
            </CardContent>
          </Card>
        ) : null}

        {shoppingResult?.notFound.length ? (
          <Card style={styles.warningCard}>
            <CardContent>
              <Text style={styles.warningText}>
                Sin resultados: {shoppingResult?.notFound.join(", ")}
              </Text>
            </CardContent>
          </Card>
        ) : null}

        {adjustedCarts.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resultados</Text>
            <PaymentMethodPicker selectedSlugs={selectedBankSlugs} onToggle={toggleBankSlug} />

            {/* Store comparison bar */}
            {adjustedCarts.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.comparisonBar}>
                {adjustedCarts.map((cart, idx) => {
                  const isWinner = idx === 0;
                  const isSelected = selectedStores.size === 0 || selectedStores.has(cart.storeName);
                  return (
                    <Pressable
                      key={cart.storeName}
                      onPress={() => toggleStore(cart.storeName)}
                      style={[
                        styles.comparisonChip,
                        isSelected
                          ? isWinner ? styles.comparisonChipWinner : styles.comparisonChipSelected
                          : styles.comparisonChipMuted,
                      ]}
                    >
                      <StoreAvatar storeName={cart.storeName} size={20} />
                      {isWinner && isSelected ? <Trophy size={12} color="#fbbf24" /> : null}
                      <Text style={[
                        styles.comparisonChipPrice,
                        isSelected && isWinner && styles.comparisonChipPriceWinner,
                      ]}>
                        {formatAmount(cart.totalPrice)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}

            {/* Comparison summary panel */}
            {comparisonSummary ? (
              <View style={styles.comparisonSection}>
                <Pressable
                  onPress={() => setShowComparison((prev) => !prev)}
                  style={[styles.comparisonToggle, showComparison && styles.comparisonToggleActive]}
                >
                  {showComparison ? (
                    <ChevronUp size={14} color={colors.primary} />
                  ) : (
                    <BarChart3 size={14} color={colors.mutedForeground} />
                  )}
                  <Text style={[styles.comparisonToggleText, showComparison && styles.comparisonToggleTextActive]}>
                    {showComparison ? "Ocultar" : "Comparar"}
                  </Text>
                </Pressable>
                {showComparison ? (
                  <Card style={styles.comparisonCard}>
                    <CardContent>
                      <View style={styles.comparisonHeader}>
                        <BarChart3 size={14} color={colors.primary} />
                        <Text style={styles.comparisonTitle}>Resumen comparativo</Text>
                      </View>
                      {comparisonSummary.split("\n\n").map((paragraph, idx) => (
                        <Text key={idx} style={styles.comparisonParagraph}>{paragraph}</Text>
                      ))}
                    </CardContent>
                  </Card>
                ) : null}
              </View>
            ) : null}

            {/* Quick-add from results */}
            <View style={styles.quickAddRow}>
              <StyledTextInput
                placeholder="Agregar producto..."
                value={quickAddTerm}
                onChangeText={setQuickAddTerm}
                onSubmitEditing={() => {
                  const term = quickAddTerm.trim();
                  if (term) { addItem(term); setQuickAddTerm(""); }
                }}
                containerStyle={styles.quickAddInput}
              />
              <Pressable
                onPress={() => {
                  const term = quickAddTerm.trim();
                  if (term) { addItem(term); setQuickAddTerm(""); }
                }}
                style={[styles.quickAddBtn, !quickAddTerm.trim() && styles.quickAddBtnDisabled]}
                disabled={!quickAddTerm.trim()}
                hitSlop={6}
              >
                <Plus size={16} color={quickAddTerm.trim() ? "#ffffff" : colors.mutedForeground} />
              </Pressable>
            </View>

            {filteredCarts.map((cart, index) => {
              const storePromos = getStorePromos(cart.storeName);
              const cartPromos = selectedBankSlugs.length > 0
                ? storePromos.filter((p) => selectedBankSlugs.includes(p.bankSlug))
                : storePromos;
              return (
              <View key={cart.storeName}>
                <StoreCartCard
                  cart={cart}
                  rank={index}
                  isSaved={savedCartByStore.has(cart.storeName)}
                  isPinned={pinnedStore === cart.storeName}
                  promos={cartPromos}
                  userCoords={userCoords ?? undefined}
                  onToggleSave={(c) => void toggleSaveStoreCart(c)}
                  onPinStore={() => setPinnedStore((prev) => prev === cart.storeName ? null : cart.storeName)}
                  onSetOverride={setProductOverride}
                />
              </View>
              );
            })}
          </View>
        ) : null}

        {adjustedCarts.length === 0 && !(shoppingPlan.isPending || isShoppingJobRunning) ? (
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
    bankPickerContainer: {
      marginBottom: spacing.md,
    },
    bankPickerLabel: {
      fontFamily: fontFamily.sans,
      fontSize: 13,
      fontWeight: "600" as const,
      color: c.mutedForeground,
      marginBottom: spacing.xs,
    },
    bankPickerScroll: {
      gap: spacing.xs,
    },
    bankChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    bankChipSelected: {
      borderColor: c.primary,
      backgroundColor: `${c.primary}15`,
    },
    bankChipText: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      color: c.mutedForeground,
    },
    bankChipTextSelected: {
      color: c.primary,
      fontWeight: "600" as const,
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
    clearAllBtn: {
      alignSelf: "center" as const,
      paddingVertical: spacing.xs,
      marginTop: spacing.xs,
    },
    clearAllText: {
      fontFamily: fontFamily.sans,
      fontSize: 13,
      color: c.mutedForeground,
    },
    undoBtn: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 4,
      alignSelf: "center" as const,
      paddingVertical: spacing.xs,
      marginTop: spacing.xs,
    },
    undoText: {
      fontFamily: fontFamily.sans,
      fontSize: 13,
      color: c.mutedForeground,
    },
    storeLogosStrip: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.xs,
      marginTop: spacing.md,
    },
    storeLogosLabel: {
      fontFamily: fontFamily.sans,
      fontSize: 11,
      color: c.mutedForeground,
    },
    storeLogosScroll: {
      gap: 4,
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
    cheapestCountText: {
      color: "#16a34a",
    },
    savingsHintText: {
      fontFamily: fontFamily.sans,
      fontSize: 11,
      fontWeight: "500" as const,
      color: "#16a34a",
    },
    savingsHintTextNeg: {
      color: "#d97706",
    },
    headerActions: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.sm,
    },
    productListSection: {
      borderTopWidth: 1,
      borderTopColor: `${c.border}60`,
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
    },
    priceDisclaimer: {
      fontFamily: fontFamily.sans,
      fontSize: 11,
      color: `${c.mutedForeground}80`,
      marginTop: spacing.xs,
    },
    missingBanner: {
      backgroundColor: "#fffbeb",
      borderRadius: radius.md,
      padding: spacing.sm,
      marginTop: spacing.sm,
    },
    missingTitle: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      fontWeight: "600" as const,
      color: "#92400e",
    },
    missingText: {
      fontFamily: fontFamily.sans,
      fontSize: 11,
      color: "#a16207",
      marginTop: 2,
    },
    productRow: {
      backgroundColor: c.background,
      borderRadius: 10,
      padding: spacing.sm,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: c.border,
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
    shareListBtn: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 6,
      flex: 1,
      paddingVertical: 10,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: `${c.primary}30`,
      backgroundColor: `${c.primary}08`,
    },
    shareListBtnText: {
      fontFamily: fontFamily.sans,
      fontSize: 13,
      fontWeight: "600" as const,
      color: c.primary,
    },
    savingsFooter: {
      backgroundColor: "#dcfce7",
      borderRadius: radius.xl,
      padding: spacing.md,
      marginTop: spacing.sm,
    },
    savingsText: {
      fontFamily: fontFamily.sans,
      fontSize: 13,
      fontWeight: "500" as const,
      color: "#166534",
    },
    cardActionsRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    pinStoreBtn: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 6,
      flex: 1,
      paddingVertical: 10,
      borderRadius: radius.lg,
      backgroundColor: `${c.muted}80`,
    },
    pinStoreBtnActive: {
      backgroundColor: `${c.primary}15`,
    },
    pinStoreText: {
      fontFamily: fontFamily.sans,
      fontSize: 13,
      fontWeight: "600" as const,
      color: c.mutedForeground,
    },
    pinStoreTextActive: {
      color: c.primary,
    },
    comparisonBar: {
      gap: spacing.sm,
      paddingVertical: spacing.xs,
      marginBottom: spacing.sm,
    },
    comparisonChip: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radius.full,
      backgroundColor: c.muted,
    },
    comparisonChipWinner: {
      backgroundColor: c.primary,
    },
    comparisonChipSelected: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    comparisonChipMuted: {
      opacity: 0.5,
    },
    comparisonChipPrice: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      fontWeight: "700" as const,
      color: c.text,
    },
    comparisonChipPriceWinner: {
      color: "#ffffff",
    },
    comparisonSection: {
      marginBottom: spacing.sm,
    },
    comparisonToggle: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 6,
      paddingVertical: 10,
      borderRadius: radius.xl,
      backgroundColor: `${c.muted}80`,
    },
    comparisonToggleActive: {
      backgroundColor: `${c.primary}15`,
    },
    comparisonToggleText: {
      fontFamily: fontFamily.sans,
      fontSize: 13,
      fontWeight: "600" as const,
      color: c.mutedForeground,
    },
    comparisonToggleTextActive: {
      color: c.primary,
    },
    comparisonCard: {
      marginTop: spacing.sm,
    },
    comparisonHeader: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
      marginBottom: spacing.sm,
    },
    comparisonTitle: {
      fontFamily: fontFamily.sans,
      fontSize: 13,
      fontWeight: "600" as const,
      color: c.text,
    },
    comparisonParagraph: {
      fontFamily: fontFamily.sans,
      fontSize: 13,
      lineHeight: 20,
      color: c.mutedForeground,
      marginTop: spacing.xs,
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
    expandChipsBtn: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 4,
      marginTop: spacing.xs,
    },
    expandChipsBtnText: {
      fontFamily: fontFamily.sans,
      fontSize: 13,
      fontWeight: "600" as const,
      color: c.primary,
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
    mapsLink: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 3,
    },
    mapsLinkText: {
      fontFamily: fontFamily.sans,
      fontSize: 11,
      fontWeight: "600" as const,
      color: c.primary,
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
    cheaperAltBtn: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 4,
      marginTop: 4,
      backgroundColor: "#dcfce7",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: radius.sm,
    },
    cheaperAltName: {
      fontFamily: fontFamily.sans,
      fontSize: 11,
      color: "#059669",
      flex: 1,
    },
    cheaperAltPrice: {
      fontFamily: fontFamily.sans,
      fontSize: 11,
      fontWeight: "700" as const,
      color: "#059669",
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
    /* --- Quick-add from results --- */
    quickAddRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 8,
      marginBottom: spacing.md,
    },
    quickAddInput: {
      flex: 1,
    },
    quickAddBtn: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      backgroundColor: c.primary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    quickAddBtnDisabled: {
      backgroundColor: c.muted,
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
