"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  ChefHat,
  Camera,
  Mic,
  MicOff,
  X,
  Loader2,
  Clock,
  Users,
  Zap,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { radius, spacing, iconSize } from "@/lib/design-tokens";

import type { Recipe, MealType } from "@/lib/llm/recipe-finder";

// ============================================
// Types
// ============================================

interface CocinaClientProps {
  aiEnabled: boolean;
  householdSize: number;
}

// ============================================
// Constants
// ============================================

const MAX_IMAGES = 3;
const MAX_IMAGE_DIMENSION = 1024;
const JPEG_QUALITY = 0.8;

const MEAL_OPTIONS: { key: MealType; label: string }[] = [
  { key: "almuerzo", label: "Almuerzo" },
  { key: "cena", label: "Cena" },
  { key: "merienda", label: "Merienda" },
  { key: "libre", label: "Libre" },
];

const DIFFICULTY_CONFIG: Record<string, { label: string; color: string }> = {
  facil: { label: "Facil", color: "bg-emerald-100 text-emerald-700" },
  media: { label: "Media", color: "bg-amber-100 text-amber-700" },
  dificil: { label: "Dificil", color: "bg-red-100 text-red-700" },
};

// ============================================
// Helpers
// ============================================

function autoDetectMealType(): MealType {
  const hour = new Date().getHours();
  if (hour < 10) return "merienda";
  if (hour < 15) return "almuerzo";
  if (hour < 19) return "merienda";
  return "cena";
}

function resizeImage(file: File, maxDimension: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context not available"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const base64 = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
      resolve(base64);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Error al cargar la imagen"));
    };

    img.src = url;
  });
}

/** Check if Web Speech API is available */
function isSpeechRecognitionAvailable(): boolean {
  return typeof window !== "undefined" && (
    "webkitSpeechRecognition" in window || "SpeechRecognition" in window
  );
}

// ============================================
// Component
// ============================================

export function CocinaClient({ aiEnabled, householdSize }: CocinaClientProps) {
  const [textInput, setTextInput] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [mealType, setMealType] = useState<MealType>(autoDetectMealType);
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [hasSpeechApi, setHasSpeechApi] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Detect Speech API on client only to avoid hydration mismatch
  useEffect(() => {
    setHasSpeechApi(isSpeechRecognitionAvailable());
  }, []);

  const canSubmit = useMemo(
    () => (textInput.trim().length > 0 || images.length > 0) && !isGenerating,
    [textInput, images, isGenerating]
  );

  // Scroll to results when they appear
  useEffect(() => {
    if (recipes && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [recipes]);

  // ---- Image handling ----
  const handleImageUpload = useCallback(async (files: FileList | null) => {
    if (!files) return;

    const remaining = MAX_IMAGES - images.length;
    const filesToProcess = Array.from(files).slice(0, remaining);

    try {
      const resized = await Promise.all(
        filesToProcess.map((file) => resizeImage(file, MAX_IMAGE_DIMENSION))
      );
      setImages((prev) => [...prev, ...resized].slice(0, MAX_IMAGES));
    } catch {
      setError("Error al procesar una imagen. Intenta con otra.");
    }
  }, [images.length]);

  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ---- Audio recording (Web Speech API) ----
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    const SpeechRecognitionApi = win.webkitSpeechRecognition ?? win.SpeechRecognition;

    if (!SpeechRecognitionApi) return;

    const recognition = new SpeechRecognitionApi();
    recognition.lang = "es-AR";
    recognition.continuous = true;
    recognition.interimResults = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const lastResult = event.results[event.results.length - 1];
      if (lastResult?.[0]) {
        const transcript = lastResult[0].transcript;
        setTextInput((prev) => prev ? `${prev} ${transcript}` : transcript);
      }
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [isRecording]);

  // ---- Submit ----
  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/cocina", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          textInput: textInput.trim(),
          images,
          mealType,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Error al generar recetas");
      }

      const data = (await response.json()) as {
        recipes: Recipe[];
        summary: string;
      };

      setRecipes(data.recipes);
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsGenerating(false);
    }
  }, [canSubmit, textInput, images, mealType]);

  // ---- AI not enabled ----
  if (!aiEnabled) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 px-6 py-12 text-center">
        <Info className="h-10 w-10 text-muted-foreground/40" />
        <h3 className="mt-3 text-sm font-semibold">IA no disponible</h3>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          Las funciones de inteligencia artificial no estan configuradas. Contacta al administrador.
        </p>
      </div>
    );
  }

  return (
    <div className={spacing.contentStack}>
      {/* Input section */}
      <div className={cn(radius.card, "border bg-white p-4", spacing.contentStack)}>
        {/* Textarea */}
        <div>
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Tengo pollo, arroz, pimientos, cebolla..."
            className="w-full resize-none rounded-xl border bg-muted/30 p-3 text-sm placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            rows={3}
            maxLength={2000}
          />
          <p className="mt-1 text-right text-[11px] text-muted-foreground">
            {textInput.length}/2000
          </p>
        </div>

        {/* Image upload */}
        <div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={images.length >= MAX_IMAGES}
              className="flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <Camera className={iconSize.sm} />
              Adjuntar fotos ({images.length}/{MAX_IMAGES})
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleImageUpload(e.target.files)}
            />

            {/* Audio button */}
            {hasSpeechApi && (
              <button
                type="button"
                onClick={toggleRecording}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  isRecording
                    ? "bg-red-100 text-red-700 animate-pulse"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {isRecording ? (
                  <>
                    <MicOff className={iconSize.sm} />
                    Detener
                  </>
                ) : (
                  <>
                    <Mic className={iconSize.sm} />
                    Dictar
                  </>
                )}
              </button>
            )}
          </div>

          {/* Image previews */}
          {images.length > 0 && (
            <div className="mt-2 flex gap-2">
              {images.map((img, index) => (
                <div key={index} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={`Ingrediente ${index + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Meal type selector */}
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Momento</p>
          <div className="flex gap-2">
            {MEAL_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setMealType(option.key)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  mealType === option.key
                    ? "bg-primary text-white shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Submit button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <Loader2 className={cn(iconSize.md, "animate-spin")} />
              Generando recetas...
            </>
          ) : (
            <>
              <ChefHat className={iconSize.md} />
              Sugerir recetas
            </>
          )}
        </button>

        {/* Household size indicator */}
        <p className="text-center text-[11px] text-muted-foreground">
          Porciones adaptadas a {householdSize} persona{householdSize > 1 ? "s" : ""}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className={iconSize.sm} />
          {error}
        </div>
      )}

      {/* Results */}
      {recipes && recipes.length > 0 && (
        <div ref={resultsRef} className={spacing.contentStack}>
          {summary && (
            <p className="text-sm text-muted-foreground">{summary}</p>
          )}
          <div className="grid grid-cols-1 gap-4">
            {recipes.map((recipe, index) => (
              <RecipeCard key={`${recipe.title}-${index}`} recipe={recipe} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// RecipeCard
// ============================================

function RecipeCard({ recipe }: { recipe: Recipe }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const difficultyConfig = DIFFICULTY_CONFIG[recipe.difficulty] ?? { label: "Facil", color: "bg-emerald-100 text-emerald-700" };

  return (
    <div className={cn(radius.card, "overflow-hidden border bg-white transition-shadow hover:shadow-md")}>
      <div className="p-4">
        {/* Header: title + badges */}
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold leading-tight">{recipe.title}</h3>
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", difficultyConfig.color)}>
            {difficultyConfig.label}
          </span>
        </div>

        {/* Meta badges */}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className={iconSize.xs} />
            {recipe.prepTimeMinutes} min
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className={iconSize.xs} />
            {recipe.servings} porcion{recipe.servings > 1 ? "es" : ""}
          </span>
        </div>

        {/* Description */}
        <p className="text-xs leading-relaxed text-muted-foreground">{recipe.description}</p>

        {/* Ingredients */}
        <div className="mt-3">
          <p className="mb-1 text-xs font-medium text-foreground">Ingredientes:</p>
          <div className="flex flex-wrap gap-1">
            {recipe.ingredients.map((ing, i) => (
              <span key={i} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">
                {ing}
              </span>
            ))}
          </div>
        </div>

        {/* Missing ingredients */}
        {recipe.missingIngredients.length > 0 && (
          <div className="mt-2">
            <p className="mb-1 text-xs font-medium text-amber-700">Te falta:</p>
            <div className="flex flex-wrap gap-1">
              {recipe.missingIngredients.map((ing, i) => (
                <span key={i} className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">
                  {ing}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Expandable steps */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-3 flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
        >
          {isExpanded ? (
            <>
              <ChevronUp className={iconSize.xs} />
              Ocultar pasos
            </>
          ) : (
            <>
              <ChevronDown className={iconSize.xs} />
              Ver pasos ({recipe.steps.length})
            </>
          )}
        </button>

        {isExpanded && (
          <div className="mt-2 space-y-1.5">
            {recipe.steps.map((step, i) => (
              <div key={i} className="flex gap-2 text-xs leading-relaxed">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                  {i + 1}
                </span>
                <span className="text-muted-foreground">{step}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tip */}
        {recipe.tips && (
          <div className="mt-3 flex gap-1.5 rounded-lg bg-amber-50 p-2">
            <Zap className="h-3.5 w-3.5 shrink-0 text-amber-600 mt-0.5" />
            <p className="text-[11px] leading-relaxed text-amber-900">
              {recipe.tips}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
