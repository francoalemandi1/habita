import { useMemo, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import { useDeleteSavedCart, useRefreshSavedCart, useSaveCart, useSavedCarts } from "@/hooks/use-saved-carts";
import { useShoppingAlternatives, useShoppingPlan } from "@/hooks/use-shopping-plan";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { semanticColors } from "@habita/design-tokens";

import type {
  AlternativeProduct,
  SavedCart,
  SaveCartInput,
  SearchItem,
  StoreCart,
} from "@habita/contracts";

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

interface ProductChipProps {
  item: SearchItem;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}

function ProductChip({ item, onIncrement, onDecrement, onRemove }: ProductChipProps) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 10,
        padding: 8,
        marginBottom: 8,
      }}
    >
      <Text style={{ fontWeight: "700", color: "#111111" }}>{item.term}</Text>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
        <Pressable
          onPress={onDecrement}
          style={{ borderRadius: 8, backgroundColor: "#f3f4f6", paddingHorizontal: 10, paddingVertical: 6 }}
        >
          <Text style={{ fontWeight: "700" }}>-</Text>
        </Pressable>
        <Text style={{ alignSelf: "center", fontWeight: "700" }}>x{item.quantity}</Text>
        <Pressable
          onPress={onIncrement}
          style={{ borderRadius: 8, backgroundColor: "#f3f4f6", paddingHorizontal: 10, paddingVertical: 6 }}
        >
          <Text style={{ fontWeight: "700" }}>+</Text>
        </Pressable>
        <Pressable
          onPress={onRemove}
          style={{ borderRadius: 8, backgroundColor: "#fee2e2", paddingHorizontal: 10, paddingVertical: 6 }}
        >
          <Text style={{ fontWeight: "700", color: "#b91c1c" }}>Quitar</Text>
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

export default function ShoppingPlanScreen() {
  const shoppingPlan = useShoppingPlan();
  const alternativesSearch = useShoppingAlternatives();
  const savedCartsQuery = useSavedCarts();
  const saveCart = useSaveCart();
  const deleteSavedCart = useDeleteSavedCart();
  const refreshSavedCart = useRefreshSavedCart();

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

    return source.map((cart) => {
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
  }, [shoppingPlan.data?.storeCarts, overrides, quantityByTerm]);

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff", padding: 20 }}>
      <ScrollView>
        <Text style={{ fontSize: 20, fontWeight: "700" }}>Ahorra</Text>
        <Text style={{ marginTop: 4, color: "#6b7280" }}>Compará precios entre supermercados.</Text>

        <View style={{ marginTop: 12, flexDirection: "row", gap: 8 }}>
          <TextInput
            placeholder="Ej: leche entera 1L"
            value={termInput}
            onChangeText={setTermInput}
            style={{ flex: 1, borderWidth: 1, borderColor: "#dddddd", borderRadius: 10, padding: 12 }}
          />
          <Pressable
            onPress={addItem}
            style={{ backgroundColor: "#f3f4f6", borderRadius: 10, paddingHorizontal: 12, justifyContent: "center" }}
          >
            <Text style={{ fontWeight: "700" }}>Agregar</Text>
          </Pressable>
        </View>

        <View style={{ marginTop: 12 }}>
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

        <Pressable
          onPress={() => void runSearch()}
          style={{
            marginTop: 8,
            backgroundColor: semanticColors.primary,
            borderRadius: 10,
            paddingVertical: 12,
            alignItems: "center",
            opacity: canSearch ? 1 : 0.65,
          }}
          disabled={!canSearch}
        >
          <Text style={{ color: "#ffffff", fontWeight: "700" }}>
            {shoppingPlan.isPending ? "Buscando..." : "Comparar precios"}
          </Text>
        </Pressable>

        {localError ? <Text style={{ marginTop: 10, color: "#b91c1c" }}>{localError}</Text> : null}

        {shoppingPlan.data?.notFound.length ? (
          <Text style={{ marginTop: 14, color: "#92400e" }}>
            Sin resultados: {shoppingPlan.data.notFound.join(", ")}
          </Text>
        ) : null}

        <View style={{ marginTop: 14 }}>
          {adjustedCarts.map((cart) => {
            const saved = savedCartByStore.get(cart.storeName);
            const pendingProducts = cart.products.filter((product) => !product.isAdded && !product.isOutOfStock);
            const addedProducts = cart.products.filter((product) => product.isAdded);
            const outProducts = cart.products.filter((product) => product.isOutOfStock);

            return (
              <View
                key={cart.storeName}
                style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 12, marginBottom: 10 }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontSize: 16, fontWeight: "700" }}>{cart.storeName}</Text>
                  <Pressable
                    onPress={() => void toggleSaveStoreCart(cart)}
                    style={{
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      backgroundColor: saved ? "#dcfce7" : "#f3f4f6",
                    }}
                  >
                    <Text style={{ fontWeight: "700", color: saved ? "#166534" : "#111111" }}>
                      {saved ? "Guardado" : "Guardar"}
                    </Text>
                  </Pressable>
                </View>
                <Text style={{ marginTop: 2, color: "#6b7280" }}>
                  {cart.products.length}/{cart.totalSearched} productos · {cart.cheapestCount} más baratos
                </Text>
                <Text style={{ marginTop: 6, fontSize: 18, fontWeight: "700", color: "#111111" }}>
                  {formatAmount(cart.totalPrice)}
                </Text>

                {[
                  { title: "Pendientes", products: pendingProducts, color: "#111111" },
                  { title: "Ya agregados", products: addedProducts, color: "#166534" },
                  { title: "Sin stock", products: outProducts, color: "#92400e" },
                ].map((group) =>
                  group.products.length > 0 ? (
                    <View key={`${cart.storeName}-${group.title}`} style={{ marginTop: 10 }}>
                      <Text style={{ fontWeight: "700", color: group.color, marginBottom: 6 }}>
                        {group.title} ({group.products.length})
                      </Text>
                      {group.products.map((product) => {
                        const key = overrideKey(cart.storeName, product.searchTerm);
                        const showReplace = replaceKey === key;
                        const replacementChoices = replaceOptions[key] ?? [];
                        const isSearchingAlternatives =
                          alternativesSearch.isPending &&
                          alternativesSearch.variables?.storeName === cart.storeName &&
                          alternativesSearch.variables?.searchTerm === product.searchTerm;
                        const recommendation = outOfStockRecommendation.get(key);

                        return (
                          <View
                            key={`${cart.storeName}-${product.searchTerm}`}
                            style={{
                              borderWidth: 1,
                              borderColor: "#f3f4f6",
                              borderRadius: 10,
                              padding: 10,
                              marginBottom: 8,
                              backgroundColor: product.isOutOfStock ? "#fffbeb" : "#ffffff",
                            }}
                          >
                            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                              <Text style={{ color: "#111111", flex: 1 }}>
                                {product.searchTerm} x{product.quantity}
                              </Text>
                              <Text style={{ color: product.isCheapest ? "#065f46" : "#111111", fontWeight: "700" }}>
                                {formatAmount(product.lineTotal)}
                              </Text>
                            </View>
                            <Text style={{ color: "#6b7280", marginTop: 2 }} numberOfLines={1}>
                              {product.productName}
                            </Text>
                            {recommendation ? (
                              <Text style={{ marginTop: 4, color: "#92400e", fontSize: 12 }}>
                                Recomendado: {recommendation.storeName} ({formatAmount(recommendation.lineTotal)})
                              </Text>
                            ) : null}

                            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                              <Pressable
                                onPress={() => updateQuantity(product.searchTerm, 1)}
                                style={{ borderRadius: 8, backgroundColor: "#f3f4f6", paddingHorizontal: 10, paddingVertical: 6 }}
                              >
                                <Text style={{ fontWeight: "700" }}>+ cant</Text>
                              </Pressable>
                              <Pressable
                                onPress={() => updateQuantity(product.searchTerm, -1)}
                                style={{ borderRadius: 8, backgroundColor: "#f3f4f6", paddingHorizontal: 10, paddingVertical: 6 }}
                              >
                                <Text style={{ fontWeight: "700" }}>- cant</Text>
                              </Pressable>
                              <Pressable
                                onPress={() =>
                                  setProductOverride(cart.storeName, product.searchTerm, {
                                    isAdded: !product.isAdded,
                                  })
                                }
                                style={{ borderRadius: 8, backgroundColor: "#dcfce7", paddingHorizontal: 10, paddingVertical: 6 }}
                              >
                                <Text style={{ fontWeight: "700", color: "#166534" }}>
                                  {product.isAdded ? "Quitar agregado" : "Ya agregado"}
                                </Text>
                              </Pressable>
                              <Pressable
                                onPress={() =>
                                  setProductOverride(cart.storeName, product.searchTerm, {
                                    isOutOfStock: !product.isOutOfStock,
                                  })
                                }
                                style={{ borderRadius: 8, backgroundColor: "#fef3c7", paddingHorizontal: 10, paddingVertical: 6 }}
                              >
                                <Text style={{ fontWeight: "700", color: "#92400e" }}>
                                  {product.isOutOfStock ? "Restituir stock" : "Sin stock"}
                                </Text>
                              </Pressable>
                            </View>

                            <View style={{ marginTop: 8 }}>
                              <Pressable
                                onPress={() => {
                                  setReplaceKey(showReplace ? null : key);
                                  if (!showReplace) {
                                    const nextQuery = product.searchTerm;
                                    setReplaceQuery(nextQuery);
                                    void runAlternativesSearch(cart.storeName, product.searchTerm, nextQuery);
                                  }
                                }}
                              >
                                <Text style={{ fontWeight: "700", color: semanticColors.primary }}>
                                  {showReplace ? "Ocultar reemplazos" : "Cambiar producto"}
                                </Text>
                              </Pressable>

                              {showReplace ? (
                                <View style={{ marginTop: 8, gap: 6 }}>
                                  <View style={{ flexDirection: "row", gap: 8 }}>
                                    <TextInput
                                      value={replaceQuery}
                                      onChangeText={setReplaceQuery}
                                      style={{
                                        flex: 1,
                                        borderWidth: 1,
                                        borderColor: "#dddddd",
                                        borderRadius: 8,
                                        padding: 8,
                                      }}
                                    />
                                    <Pressable
                                      onPress={() =>
                                        void runAlternativesSearch(
                                          cart.storeName,
                                          product.searchTerm,
                                          replaceQuery.trim().length > 1
                                            ? replaceQuery
                                            : product.searchTerm,
                                        )
                                      }
                                      style={{
                                        borderRadius: 8,
                                        backgroundColor: "#f3f4f6",
                                        paddingHorizontal: 10,
                                        justifyContent: "center",
                                      }}
                                    >
                                      <Text style={{ fontWeight: "700" }}>
                                        {isSearchingAlternatives ? "..." : "Buscar"}
                                      </Text>
                                    </Pressable>
                                  </View>

                                  {replacementChoices.map((alternative) => (
                                    <Pressable
                                      key={alternative.link}
                                      onPress={() =>
                                        setProductOverride(cart.storeName, product.searchTerm, {
                                          replacement: alternative,
                                        })
                                      }
                                      style={{
                                        borderWidth: 1,
                                        borderColor: "#e5e7eb",
                                        borderRadius: 8,
                                        padding: 8,
                                      }}
                                    >
                                      <Text style={{ fontWeight: "600" }} numberOfLines={1}>
                                        {alternative.productName}
                                      </Text>
                                      <Text style={{ marginTop: 2, color: "#111111", fontWeight: "700" }}>
                                        {formatAmount(alternative.price * product.quantity)}
                                      </Text>
                                    </Pressable>
                                  ))}
                                </View>
                              ) : null}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ) : null,
                )}
              </View>
            );
          })}
        </View>

        <View style={{ marginTop: 18 }}>
          <Text style={{ fontSize: 18, fontWeight: "700" }}>Guardados</Text>
          <Text style={{ marginTop: 4, color: "#6b7280" }}>Tus carritos guardados y actualizables.</Text>
          <View style={{ marginTop: 10 }}>
            {savedCarts.map((savedCart) => {
              const adapted = fromSavedCart(savedCart);
              return (
                <View
                  key={savedCart.id}
                  style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 12, marginBottom: 10 }}
                >
                  <Text style={{ fontWeight: "700", fontSize: 16 }}>{adapted.storeName}</Text>
                  <Text style={{ marginTop: 2, color: "#6b7280" }}>
                    {new Date(savedCart.savedAt).toLocaleDateString("es-AR")} · {adapted.products.length} productos
                  </Text>
                  <Text style={{ marginTop: 6, fontSize: 18, fontWeight: "700" }}>
                    {formatAmount(adapted.totalPrice)}
                  </Text>
                  <View style={{ marginTop: 8, flexDirection: "row", gap: 8 }}>
                    <Pressable
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
                      style={{ borderRadius: 8, backgroundColor: "#f3f4f6", paddingHorizontal: 10, paddingVertical: 6 }}
                    >
                      <Text style={{ fontWeight: "700" }}>Cargar lista</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void refreshSavedCart.mutateAsync(savedCart.id)}
                      style={{ borderRadius: 8, backgroundColor: "#dbeafe", paddingHorizontal: 10, paddingVertical: 6 }}
                    >
                      <Text style={{ fontWeight: "700", color: "#1d4ed8" }}>Refrescar</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void deleteSavedCart.mutateAsync(savedCart.id)}
                      style={{ borderRadius: 8, backgroundColor: "#fee2e2", paddingHorizontal: 10, paddingVertical: 6 }}
                    >
                      <Text style={{ fontWeight: "700", color: "#b91c1c" }}>Eliminar</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
