"use client";

import { useState, useEffect, useCallback } from "react";

interface WhatsAppLinkStatus {
  isLinked: boolean;
  phoneNumber?: string;
  isVerified?: boolean;
  isActive?: boolean;
  isVerificationExpired?: boolean;
}

interface UseWhatsAppLinkReturn {
  isLinked: boolean;
  isVerified: boolean;
  isVerificationExpired: boolean;
  phoneNumber: string | null;
  isLoading: boolean;
  link: (phoneNumber: string) => Promise<{ success: boolean; error?: string }>;
  resend: () => Promise<{ success: boolean; error?: string }>;
  unlink: () => Promise<boolean>;
}

export function useWhatsAppLink(): UseWhatsAppLinkReturn {
  const [status, setStatus] = useState<WhatsAppLinkStatus>({ isLinked: false });
  const [isLoading, setIsLoading] = useState(true);
  const [lastPhoneNumber, setLastPhoneNumber] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch("/api/whatsapp/link");
        if (response.ok) {
          const data: WhatsAppLinkStatus = await response.json();
          setStatus(data);
        }
      } catch {
        // Ignore fetch errors on mount
      }
      setIsLoading(false);
    };

    fetchStatus();
  }, []);

  const link = useCallback(
    async (
      phoneNumber: string
    ): Promise<{ success: boolean; error?: string }> => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/whatsapp/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phoneNumber }),
        });

        const data = await response.json();

        if (response.ok) {
          setLastPhoneNumber(phoneNumber);
          setStatus({
            isLinked: true,
            phoneNumber:
              phoneNumber.slice(0, 7) + "****" + phoneNumber.slice(-3),
            isVerified: false,
            isActive: true,
            isVerificationExpired: false,
          });
          setIsLoading(false);
          return { success: true };
        }

        setIsLoading(false);
        return { success: false, error: data.error ?? "Error al vincular" };
      } catch {
        setIsLoading(false);
        return { success: false, error: "Error de red" };
      }
    },
    []
  );

  /** Re-send verification code using the same phone number. */
  const resend = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!lastPhoneNumber) {
      return { success: false, error: "No hay número para reenviar. Vinculá de nuevo." };
    }
    return link(lastPhoneNumber);
  }, [lastPhoneNumber, link]);

  const unlink = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/whatsapp/link", {
        method: "DELETE",
      });

      if (response.ok) {
        setStatus({ isLinked: false });
        setLastPhoneNumber(null);
        setIsLoading(false);
        return true;
      }

      setIsLoading(false);
      return false;
    } catch {
      setIsLoading(false);
      return false;
    }
  }, []);

  return {
    isLinked: status.isLinked,
    isVerified: status.isVerified ?? false,
    isVerificationExpired: status.isVerificationExpired ?? false,
    phoneNumber: status.phoneNumber ?? null,
    isLoading,
    link,
    resend,
    unlink,
  };
}
