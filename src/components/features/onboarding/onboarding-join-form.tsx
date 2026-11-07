"use client";

import { Button, TextField } from "@/components/ds";

import type { FormEvent } from "react";

interface OnboardingJoinFormProps {
  inviteCode: string;
  onInviteCodeChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  loading: boolean;
  error?: string | null;
}

/** Unirse — invite code entry, per handoff §5.3. */
export function OnboardingJoinForm({
  inviteCode,
  onInviteCodeChange,
  onSubmit,
  loading,
  error,
}: OnboardingJoinFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <h1 className="text-[32px] font-bold leading-tight tracking-[-0.035em] text-ink">Unirse a un hogar</h1>
      <TextField
        label="Código de invitación"
        placeholder="CODIGO"
        value={inviteCode}
        onChange={(e) => onInviteCodeChange(e.target.value.toUpperCase().slice(0, 8))}
        className="text-center font-mono text-lg tracking-widest"
        maxLength={8}
        autoFocus
        error={error ?? undefined}
      />
      <Button type="submit" className="w-full" disabled={!inviteCode.trim()} loading={loading} loadingLabel="Uniéndote">
        Unirme
      </Button>
    </form>
  );
}
