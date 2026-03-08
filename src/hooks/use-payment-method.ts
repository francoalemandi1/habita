"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "habita:payment-method";

export interface PaymentMethod {
  bankSlug: string;
  label: string;
}

/** Banks/wallets shown in the payment method selector, in display order. */
export const PAYMENT_METHOD_OPTIONS: PaymentMethod[] = [
  // Billeteras virtuales (most used)
  { bankSlug: "mercadopago", label: "Mercado Pago" },
  { bankSlug: "naranjax", label: "Naranja X" },
  { bankSlug: "modo", label: "MODO" },
  { bankSlug: "uala", label: "Ualá" },
  { bankSlug: "personalpay", label: "Personal Pay" },
  { bankSlug: "cuentadni", label: "Cuenta DNI" },
  // Bancos más comunes
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
    "bankSlug" in (value as object) &&
    "label" in (value as object) &&
    typeof (value as Record<string, unknown>).bankSlug === "string" &&
    typeof (value as Record<string, unknown>).label === "string"
  );
}

function load(): PaymentMethod[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    // Handle new array format
    if (Array.isArray(parsed)) {
      return parsed.filter(isValidMethod);
    }
    // Discard old single-object format (migration)
    return [];
  } catch {
    // corrupted — ignore
  }
  return [];
}

function save(methods: PaymentMethod[]) {
  try {
    if (methods.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(methods));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // localStorage unavailable — ignore
  }
}

export function usePaymentMethod() {
  const [paymentMethods, setPaymentMethodsState] = useState<PaymentMethod[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setPaymentMethodsState(load());
    setIsHydrated(true);
  }, []);

  const togglePaymentMethod = useCallback((method: PaymentMethod) => {
    setPaymentMethodsState((prev) => {
      const exists = prev.some((m) => m.bankSlug === method.bankSlug);
      const next = exists
        ? prev.filter((m) => m.bankSlug !== method.bankSlug)
        : [...prev, method];
      save(next);
      return next;
    });
  }, []);

  const clearPaymentMethods = useCallback(() => {
    save([]);
    setPaymentMethodsState([]);
  }, []);

  return { paymentMethods, togglePaymentMethod, clearPaymentMethods, isHydrated };
}
