"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface JoinFormProps {
  code: string;
  householdName: string;
  userName: string;
}

interface JoinResponse {
  alreadyMember?: boolean;
  error?: string;
}

export function JoinForm({ code, householdName, userName }: JoinFormProps) {
  const router = useRouter();
  const [memberName, setMemberName] = useState(userName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/households/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteCode: code,
          memberName: memberName.trim(),
          memberType: "adult",
        }),
      });

      const data = (await res.json()) as JoinResponse;

      if (!res.ok) {
        throw new Error(data.error ?? "Error al unirse al hogar");
      }

      router.refresh();
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al unirse");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="memberName" className="mb-1.5 block text-sm font-medium">
          Tu nombre en {householdName}
        </label>
        <Input
          id="memberName"
          placeholder="Tu nombre"
          value={memberName}
          onChange={(e) => setMemberName(e.target.value)}
          disabled={loading}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading ? "Uniéndose..." : "Unirme al hogar"}
      </Button>
    </form>
  );
}
