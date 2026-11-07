"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ds";
import { APP_ROUTES } from "@habita/contracts";

interface JoinFormProps {
  code: string;
}

interface JoinResponse {
  alreadyMember?: boolean;
  error?: string;
}

export function JoinForm({ code }: JoinFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/households/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: code }),
      });
      const data = (await res.json()) as JoinResponse;
      if (!res.ok) throw new Error(data.error ?? "Error al unirse al hogar");
      router.refresh();
      router.push(APP_ROUTES.casa);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al unirse");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && <p className="text-[13px] text-ladrillo-text">{error}</p>}
      <Button
        type="button"
        className="w-full"
        onClick={() => void handleSubmit()}
        loading={loading}
        loadingLabel="Uniéndote"
      >
        Unirme al hogar
      </Button>
    </div>
  );
}
