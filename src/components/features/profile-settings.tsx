"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { InviteShareBlock } from "@/components/features/invite-share-block";
import { useToast } from "@/components/ui/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Check, X, Users, UserPlus, MapPin, CalendarClock, Loader2, Bell, BellOff, ChevronRight, Settings, ListTodo, RefreshCw } from "lucide-react";
import { useGeolocation } from "@/hooks/use-geolocation";
import { usePushNotifications } from "@/hooks/use-push-notifications";

import type { MemberType } from "@prisma/client";

interface HouseholdMember {
  id: string;
  name: string;
  memberType: MemberType;
  isActive: boolean;
}

interface HouseholdLocation {
  timezone: string | null;
  country: string | null;
  city: string | null;
}

interface ProfileSettingsProps {
  memberName: string;
  householdName: string;
  inviteCode: string;
  members: HouseholdMember[];
  isAdult: boolean;
  location?: HouseholdLocation;
  planningDay?: number | null;
}

const MEMBER_TYPE_LABELS: Record<MemberType, string> = {
  ADULT: "Adulto",
  TEEN: "Adolescente",
  CHILD: "Niño",
};

const DAY_LABELS: Record<number, string> = {
  0: "Domingos",
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábados",
};

export function ProfileSettings({
  memberName,
  householdName,
  inviteCode,
  members,
  isAdult,
  location: savedLocation,
  planningDay: initialPlanningDay,
}: ProfileSettingsProps) {
  const router = useRouter();
  const toast = useToast();

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(memberName);
  const [isSavingName, setIsSavingName] = useState(false);

  const [isEditingHousehold, setIsEditingHousehold] = useState(false);
  const [householdValue, setHouseholdValue] = useState(householdName);
  const [isSavingHousehold, setIsSavingHousehold] = useState(false);

  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const { location: geoLocation } = useGeolocation();

  const [isSavingPlanningDay, setIsSavingPlanningDay] = useState(false);

  const push = usePushNotifications();

  const handleTogglePush = async () => {
    if (push.isSubscribed) {
      const ok = await push.unsubscribe();
      if (ok) {
        toast.success("Notificaciones desactivadas", "Ya no recibirás recordatorios push");
      } else {
        toast.error("Error", "No se pudieron desactivar las notificaciones");
      }
    } else {
      const ok = await push.subscribe();
      if (ok) {
        toast.success("Notificaciones activadas", "Recibirás recordatorios de tus tareas");
      } else if (push.permission === "denied") {
        toast.error("Permiso denegado", "Habilitá las notificaciones desde la configuración de tu navegador");
      } else {
        toast.error("Error", "No se pudieron activar las notificaciones");
      }
    }
  };

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

  const handleDetectLocation = async () => {
    if (!geoLocation || geoLocation.latitude === 0) {
      toast.error("Ubicación no disponible", "Permití el acceso a la ubicación en tu navegador");
      return;
    }

    setIsDetectingLocation(true);
    try {
      const response = await fetch("/api/households", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: {
            latitude: geoLocation.latitude,
            longitude: geoLocation.longitude,
            timezone: geoLocation.timezone,
            country: geoLocation.country,
            city: geoLocation.city,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json() as { error?: string };
        throw new Error(data.error ?? "Error al guardar ubicación");
      }

      const locationLabel = [geoLocation.city, geoLocation.country].filter(Boolean).join(", ");
      toast.success("Ubicación actualizada", locationLabel || geoLocation.timezone);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al guardar";
      toast.error("Error", message);
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handlePlanningDayChange = async (value: string) => {
    const planningDay = value === "disabled" ? null : parseInt(value, 10);

    setIsSavingPlanningDay(true);
    try {
      const response = await fetch("/api/households", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planningDay }),
      });

      if (!response.ok) {
        const data = await response.json() as { error?: string };
        throw new Error(data.error ?? "Error al guardar");
      }

      toast.success(
        "Día de planificación actualizado",
        planningDay != null ? `Se generará el plan los ${DAY_LABELS[planningDay]}` : "Planificación automática desactivada"
      );
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al guardar";
      toast.error("Error", message);
    } finally {
      setIsSavingPlanningDay(false);
    }
  };

  const currentLocationLabel = savedLocation?.city || savedLocation?.country
    ? [savedLocation.city, savedLocation.country].filter(Boolean).join(", ")
    : savedLocation?.timezone ?? null;

  return (
    <div className="space-y-6">
      {/* Edit name */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-3">
          <h3 className="text-lg font-semibold">Mi nombre</h3>
          <p className="text-sm text-muted-foreground">Cómo te ven los demás miembros del hogar</p>
        </div>
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
      </div>

      {/* Household settings */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-3">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Users className="h-5 w-5" />
            Mi hogar
          </h3>
          <p className="text-sm text-muted-foreground">Configuración del hogar y miembros</p>
        </div>
        <div className="space-y-4">
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

          {/* Invite */}
          <InviteShareBlock inviteCode={inviteCode} householdName={householdName} />

          {/* Members list */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Miembros ({members.length})
            </p>
            <div className="space-y-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-2 rounded-2xl bg-muted/30 px-3 py-2"
                >
                  <span className="min-w-0 truncate font-medium">{m.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {MEMBER_TYPE_LABELS[m.memberType]}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Location */}
          {isAdult && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Ubicación</p>
              <div className="flex flex-wrap items-center justify-between gap-2 sm:flex-nowrap">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 truncate text-sm font-medium">
                    {currentLocationLabel ?? "Sin configurar"}
                  </span>
                  {savedLocation?.timezone && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      {savedLocation.timezone}
                    </Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDetectLocation}
                  disabled={isDetectingLocation}
                  className="shrink-0 gap-2"
                >
                  {isDetectingLocation ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MapPin className="h-4 w-4" />
                  )}
                  Detectar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                La ubicación mejora las sugerencias de la IA con clima y contexto local
              </p>
            </div>
          )}

          {/* Planning Day */}
          {isAdult && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Día de planificación automática</p>
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Select
                  value={initialPlanningDay != null ? String(initialPlanningDay) : "disabled"}
                  onValueChange={handlePlanningDayChange}
                  disabled={isSavingPlanningDay || !savedLocation?.timezone}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disabled">Desactivado</SelectItem>
                    <SelectItem value="0">Domingo</SelectItem>
                    <SelectItem value="1">Lunes</SelectItem>
                    <SelectItem value="2">Martes</SelectItem>
                    <SelectItem value="3">Miércoles</SelectItem>
                    <SelectItem value="4">Jueves</SelectItem>
                    <SelectItem value="5">Viernes</SelectItem>
                    <SelectItem value="6">Sábado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!savedLocation?.timezone ? (
                <p className="text-xs text-amber-600 mt-1">
                  Configurá tu ubicación primero para activar la planificación automática
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  Las tareas se distribuyen automáticamente el día elegido y recibís un email con el resumen
                </p>
              )}
            </div>
          )}

          {/* Push Notifications */}
          {push.isSupported && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Notificaciones push</p>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {push.isSubscribed ? (
                    <Bell className="h-4 w-4 text-primary" />
                  ) : (
                    <BellOff className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium">
                    {push.isSubscribed ? "Activadas" : "Desactivadas"}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant={push.isSubscribed ? "outline" : "default"}
                  onClick={handleTogglePush}
                  disabled={push.isLoading}
                  className="shrink-0 gap-2"
                >
                  {push.isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : push.isSubscribed ? (
                    "Desactivar"
                  ) : (
                    "Activar"
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Recibí recordatorios para completar tus tareas del día
              </p>
            </div>
          )}

          {/* Config links */}
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-2">Configuración</p>
            <div className="space-y-1">
              <Link
                href="/preferences"
                className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Preferencias y disponibilidad</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
              <Link
                href="/tasks"
                className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <ListTodo className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Tareas del hogar</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
              <Link
                href="/rotations"
                className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Rotaciones automáticas</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </div>
          </div>

          {/* Invite CTA */}
          {members.length === 1 && (
            <div className="flex items-center gap-3 rounded-2xl bg-muted/30 px-4 py-3">
              <UserPlus className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">¿Compartís tu hogar?</p>
                <p className="text-xs text-muted-foreground">
                  Invitá a alguien a unirse y organicen las tareas juntos
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
