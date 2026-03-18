"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { parseOnboardingProfile } from "@/lib/onboarding-profile";
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
import { Pencil, Check, X, Users, UserPlus, MapPin, CalendarClock, Loader2, Bell, BellOff, ChevronRight, Settings, ListTodo, RefreshCw, Palette, HelpCircle, Search } from "lucide-react";
import { CityTypeahead } from "@/components/ui/city-typeahead";
import type { CityResult } from "@/components/ui/city-typeahead";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useGeolocation } from "@/hooks/use-geolocation";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { resetAllGuides } from "@/hooks/use-first-visit";
import { apiFetch } from "@/lib/api-client";

import type { MemberType } from "@prisma/client";
import type { Prisma } from "@prisma/client";

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
  onboardingProfile?: Prisma.JsonValue | null;
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
  onboardingProfile,
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
  const [citySearch, setCitySearch] = useState("");
  const [showCitySearch, setShowCitySearch] = useState(false);
  const [isSavingCity, setIsSavingCity] = useState(false);

  const [isSavingPlanningDay, setIsSavingPlanningDay] = useState(false);

  const push = usePushNotifications();

  // Dietary preferences from onboarding profile
  const parsedProfile = useMemo(
    () => parseOnboardingProfile(onboardingProfile),
    [onboardingProfile],
  );

  const [dietaryHints, setDietaryHints] = useState<string[]>(parsedProfile.dietaryHints);
  const [newHint, setNewHint] = useState("");
  const [isSavingDietary, setIsSavingDietary] = useState(false);

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
      await apiFetch("/api/members/me", {
        method: "PATCH",
        body: { name: trimmed },
      });

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
      await apiFetch("/api/households", {
        method: "PATCH",
        body: { name: trimmed },
      });

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
      // Geolocation failed — show manual city search instead
      setShowCitySearch(true);
      return;
    }

    setIsDetectingLocation(true);
    try {
      await apiFetch("/api/households", {
        method: "PATCH",
        body: {
          location: {
            latitude: geoLocation.latitude,
            longitude: geoLocation.longitude,
            timezone: geoLocation.timezone,
            country: geoLocation.country,
            city: geoLocation.city,
          },
        },
      });

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

  const browserTimezone =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "America/Argentina/Buenos_Aires";

  const handleSelectCity = async (city: CityResult) => {
    setIsSavingCity(true);
    try {
      await apiFetch("/api/households", {
        method: "PATCH",
        body: {
          location: {
            ...(city.latitude != null && { latitude: city.latitude }),
            ...(city.longitude != null && { longitude: city.longitude }),
            timezone: browserTimezone,
            country: "AR",
            city: city.name,
          },
        },
      });

      toast.success("Ubicación actualizada", `${city.name}, ${city.province}`);
      setShowCitySearch(false);
      setCitySearch("");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al guardar";
      toast.error("Error", message);
    } finally {
      setIsSavingCity(false);
    }
  };

  const handlePlanningDayChange = async (value: string) => {
    const planningDay = value === "disabled" ? null : parseInt(value, 10);

    setIsSavingPlanningDay(true);
    try {
      await apiFetch("/api/households", {
        method: "PATCH",
        body: { planningDay },
      });

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

  const handleSaveDietaryHints = async (updatedHints: string[]) => {
    setIsSavingDietary(true);
    try {
      const currentProfile = (typeof onboardingProfile === "object" && onboardingProfile && !Array.isArray(onboardingProfile))
        ? onboardingProfile as Record<string, unknown>
        : {};
      await apiFetch("/api/households", {
        method: "PATCH",
        body: JSON.stringify({
          onboardingProfile: {
            ...currentProfile,
            dietaryHints: updatedHints,
          },
        }),
      });
      setDietaryHints(updatedHints);
      toast.success("Preferencias alimentarias actualizadas");
    } catch {
      toast.error("Error", "Error al guardar preferencias alimentarias");
    } finally {
      setIsSavingDietary(false);
    }
  };

  const handleResetGuides = () => {
    resetAllGuides();
    toast.success("Guías reiniciadas", "La próxima vez que entres a cada sección vas a ver las guías de nuevo");
  };

  const currentLocationLabel = savedLocation?.city || savedLocation?.country
    ? [savedLocation.city, savedLocation.country].filter(Boolean).join(", ")
    : savedLocation?.timezone ?? null;

  return (
    <div className="space-y-6">
      {/* ══════════════════════════════════════
          SECTION 1: MI CUENTA (personal)
         ══════════════════════════════════════ */}
      <div className="rounded-2xl bg-card p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Mi cuenta</h3>
          <p className="text-sm text-muted-foreground">Tu perfil y preferencias personales</p>
        </div>
        <div className="space-y-4">
          {/* Name */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">Nombre</p>
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

          {/* Appearance */}
          <div>
            <div className="flex items-center justify-between rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Tema</span>
              </div>
              <ThemeToggle />
            </div>
          </div>

          {/* Push Notifications */}
          {push.isSupported && (
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {push.isSubscribed ? (
                    <Bell className="h-4 w-4 text-primary" />
                  ) : (
                    <BellOff className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium">
                    Notificaciones {push.isSubscribed ? "activadas" : "desactivadas"}
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
              <p className="text-xs text-muted-foreground mt-1 pl-6">
                Recordatorios de tareas del día
              </p>
            </div>
          )}

          {/* Personal config links */}
          <div className="border-t pt-4 space-y-1">
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
            <button
              type="button"
              onClick={handleResetGuides}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                <div className="text-left">
                  <span className="text-sm font-medium">Guías de uso</span>
                  <p className="text-xs text-muted-foreground">Volvé a ver las guías de cada sección</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          SECTION 2: MI HOGAR (shared)
         ══════════════════════════════════════ */}
      <div className="rounded-2xl bg-card p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Users className="h-5 w-5" />
            Mi hogar
          </h3>
          <p className="text-sm text-muted-foreground">Configuración compartida del hogar</p>
        </div>
        <div className="space-y-4">
          {/* Onboarding profile nudge */}
          {!onboardingProfile && isAdult && (
            <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
              <p className="text-sm font-medium text-primary">Personalizá tu experiencia</p>
              <p className="text-xs text-muted-foreground mt-1">
                Agregá ubicación y preferencias alimentarias para mejorar las recomendaciones.
              </p>
            </div>
          )}

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

          {/* Location */}
          {isAdult && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Ubicación</p>
              {currentLocationLabel && !showCitySearch ? (
                <div className="flex flex-wrap items-center justify-between gap-2 sm:flex-nowrap">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 truncate text-sm font-medium">
                      {currentLocationLabel}
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
                    onClick={() => setShowCitySearch(true)}
                    className="shrink-0 gap-2"
                  >
                    <Pencil className="h-4 w-4" />
                    Cambiar
                  </Button>
                </div>
              ) : showCitySearch ? (
                <div className="space-y-2">
                  <CityTypeahead
                    value={citySearch}
                    onChange={setCitySearch}
                    onSelectCity={handleSelectCity}
                    placeholder="Buscar tu ciudad..."
                  />
                  {isSavingCity && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Guardando...
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowCitySearch(false);
                        setCitySearch("");
                      }}
                      className="text-xs"
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDetectLocation}
                      disabled={isDetectingLocation}
                      className="text-xs gap-1"
                    >
                      {isDetectingLocation ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <MapPin className="h-3 w-3" />
                      )}
                      Detectar automáticamente
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Sin configurar</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowCitySearch(true)}
                      className="gap-2"
                    >
                      <Search className="h-4 w-4" />
                      Buscar ciudad
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDetectLocation}
                      disabled={isDetectingLocation}
                      className="gap-2"
                    >
                      {isDetectingLocation ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MapPin className="h-4 w-4" />
                      )}
                      Detectar
                    </Button>
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                La ubicación mejora las sugerencias con clima y contexto local
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

          {/* Members list */}
          <div className="border-t pt-4">
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

            {/* Invite */}
            <div className="mt-3">
              <InviteShareBlock inviteCode={inviteCode} householdName={householdName} />
            </div>

            {members.length === 1 && (
              <div className="flex items-center gap-3 rounded-2xl bg-muted/30 px-4 py-3 mt-3">
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

          {/* Dietary preferences */}
          {isAdult && (
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-2">Preferencias alimentarias</p>
              {dietaryHints.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {dietaryHints.map((hint, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {hint}
                      <button
                        onClick={() => {
                          const updated = dietaryHints.filter((_, idx) => idx !== i);
                          void handleSaveDietaryHints(updated);
                        }}
                        className="ml-0.5 hover:text-destructive"
                        disabled={isSavingDietary}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground/70 mb-2">
                  Sin preferencias. Agregá restricciones alimentarias para personalizar tus recetas.
                </p>
              )}
              <div className="flex items-center gap-2">
                <Input
                  value={newHint}
                  onChange={(e) => setNewHint(e.target.value)}
                  placeholder="Ej: vegetariano, sin TACC..."
                  maxLength={100}
                  className="text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newHint.trim()) {
                      void handleSaveDietaryHints([...dietaryHints, newHint.trim()]);
                      setNewHint("");
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={() => {
                    if (newHint.trim()) {
                      void handleSaveDietaryHints([...dietaryHints, newHint.trim()]);
                      setNewHint("");
                    }
                  }}
                  disabled={!newHint.trim() || isSavingDietary}
                >
                  {isSavingDietary ? <Loader2 className="h-4 w-4 animate-spin" /> : "Agregar"}
                </Button>
              </div>
            </div>
          )}

          {/* Household config links */}
          <div className="border-t pt-4 space-y-1">
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
      </div>
    </div>
  );
}
