"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { useToast } from "@/components/ui/toast";
import { Pencil, Check, X, Users, UserPlus } from "lucide-react";

import type { MemberType } from "@prisma/client";

interface HouseholdMember {
  id: string;
  name: string;
  memberType: MemberType;
  isActive: boolean;
}

interface ProfileSettingsProps {
  memberName: string;
  householdName: string;
  inviteCode: string;
  members: HouseholdMember[];
  isAdult: boolean;
}

const MEMBER_TYPE_LABELS: Record<MemberType, string> = {
  ADULT: "Adulto",
  TEEN: "Adolescente",
  CHILD: "Niño",
};

export function ProfileSettings({
  memberName,
  householdName,
  inviteCode,
  members,
  isAdult,
}: ProfileSettingsProps) {
  const router = useRouter();
  const toast = useToast();

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(memberName);
  const [isSavingName, setIsSavingName] = useState(false);

  const [isEditingHousehold, setIsEditingHousehold] = useState(false);
  const [householdValue, setHouseholdValue] = useState(householdName);
  const [isSavingHousehold, setIsSavingHousehold] = useState(false);

  const handleSaveName = async () => {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === memberName) {
      setIsEditingName(false);
      setNameValue(memberName);
      return;
    }

    setIsSavingName(true);
    try {
      const response = await fetch("/api/members/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      if (!response.ok) {
        const data = await response.json() as { error?: string };
        throw new Error(data.error ?? "Error al guardar");
      }

      toast.success("Nombre actualizado", `Tu nombre ahora es ${trimmed}`);
      setIsEditingName(false);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al guardar";
      toast.error("Error", message);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleSaveHousehold = async () => {
    const trimmed = householdValue.trim();
    if (!trimmed || trimmed === householdName) {
      setIsEditingHousehold(false);
      setHouseholdValue(householdName);
      return;
    }

    setIsSavingHousehold(true);
    try {
      const response = await fetch("/api/households", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      if (!response.ok) {
        const data = await response.json() as { error?: string };
        throw new Error(data.error ?? "Error al guardar");
      }

      toast.success("Hogar actualizado", `El hogar ahora se llama ${trimmed}`);
      setIsEditingHousehold(false);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al guardar";
      toast.error("Error", message);
    } finally {
      setIsSavingHousehold(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Edit name */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Mi nombre</CardTitle>
          <CardDescription>Cómo te ven los demás miembros del hogar</CardDescription>
        </CardHeader>
        <CardContent>
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                maxLength={50}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName();
                  if (e.key === "Escape") {
                    setIsEditingName(false);
                    setNameValue(memberName);
                  }
                }}
              />
              <Button size="sm" onClick={handleSaveName} disabled={isSavingName}>
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsEditingName(false);
                  setNameValue(memberName);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate font-medium">{memberName}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditingName(true)}
                className="shrink-0 gap-2"
              >
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Household settings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Mi hogar
          </CardTitle>
          <CardDescription>Configuración del hogar y miembros</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Household name */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">Nombre del hogar</p>
            {isEditingHousehold && isAdult ? (
              <div className="flex items-center gap-2">
                <Input
                  value={householdValue}
                  onChange={(e) => setHouseholdValue(e.target.value)}
                  maxLength={50}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveHousehold();
                    if (e.key === "Escape") {
                      setIsEditingHousehold(false);
                      setHouseholdValue(householdName);
                    }
                  }}
                />
                <Button size="sm" onClick={handleSaveHousehold} disabled={isSavingHousehold}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsEditingHousehold(false);
                    setHouseholdValue(householdName);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate font-medium">{householdName}</span>
                {isAdult && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditingHousehold(true)}
                    className="shrink-0 gap-2"
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Invite code */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">Código de invitación</p>
            <div className="flex items-center gap-2">
              <code className="rounded-xl bg-muted px-3 py-1.5 font-mono text-sm font-semibold tracking-widest">
                {inviteCode}
              </code>
              <CopyButton value={inviteCode} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Compartí este código para que otros se unan a tu hogar
            </p>
          </div>

          {/* Members list */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Miembros ({members.length})
            </p>
            <div className="space-y-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2"
                >
                  <span className="min-w-0 truncate font-medium">{m.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {MEMBER_TYPE_LABELS[m.memberType]}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Invite CTA */}
          {members.length === 1 && (
            <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
              <UserPlus className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium">¡Invitá a tu familia!</p>
                <p className="text-xs text-muted-foreground">
                  Compartí el código de invitación para que otros miembros se unan
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
