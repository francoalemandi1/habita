import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "habita_mobile_payment_methods";

export interface PaymentMethod {
  bankSlug: string;
  label: string;
}

/** Banks/wallets shown in the payment method selector, in display order. */
export const PAYMENT_METHOD_OPTIONS: PaymentMethod[] = [
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

function isValidMethod(value: unknown): value is PaymentMethod {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof (value as Record<string, unknown>).bankSlug === "string" &&
    typeof (value as Record<string, unknown>).label === "string"
  );
}

/** Persisted payment-method selection for the Súper Comparar bank promo banner. */
export function usePaymentMethods() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) setPaymentMethods(parsed.filter(isValidMethod));
      })
      .catch((error: unknown) => console.warn("[super] could not read payment methods", error));
  }, []);

  const togglePaymentMethod = useCallback((method: PaymentMethod) => {
    setPaymentMethods((prev) => {
      const exists = prev.some((m) => m.bankSlug === method.bankSlug);
      const next = exists ? prev.filter((m) => m.bankSlug !== method.bankSlug) : [...prev, method];
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch((error: unknown) =>
        console.warn("[super] could not save payment methods", error),
      );
      return next;
    });
  }, []);

  return { paymentMethods, togglePaymentMethod };
}
