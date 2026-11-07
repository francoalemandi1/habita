"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { z } from "zod";
import { cn } from "@/lib/utils";

const cityResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  province: z.string(),
  latitude: z.number().nullish(),
  longitude: z.number().nullish(),
});

const citySearchResponseSchema = z.object({ cities: z.array(cityResultSchema) });

export type CityResult = z.infer<typeof cityResultSchema>;

interface CityTypeaheadProps {
  value: string;
  onChange: (value: string) => void;
  onSelectCity: (city: CityResult) => void;
  placeholder?: string;
  className?: string;
}

/** §6.3 TextField shape — city search with suggestions, used in Crear hogar and Perfil → Ubicación. */
export function CityTypeahead({ value, onChange, onSelectCity, placeholder = "Buscar ciudad...", className }: CityTypeaheadProps) {
  const [cities, setCities] = useState<CityResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.length < 2) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/cities?q=${encodeURIComponent(value)}`);
        if (res.ok) {
          const parsed = citySearchResponseSchema.safeParse(await res.json());
          if (!parsed.success) {
            console.warn("CityTypeahead: unexpected city search response", parsed.error);
            return;
          }
          setCities(parsed.data.cities);
          setIsOpen(true);
        }
      } catch (error) {
        console.warn("CityTypeahead: city search failed", error);
        setCities([]);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [value]);

  const effectiveCities = value.length < 2 ? [] : cities;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !(e.target instanceof Node && containerRef.current.contains(e.target))) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const showDropdown = isOpen && isFocused && effectiveCities.length > 0;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => {
          setIsFocused(true);
          if (effectiveCities.length > 0) setIsOpen(true);
        }}
        onBlur={() => {
          setTimeout(() => setIsFocused(false), 150);
        }}
        autoComplete="off"
        className="h-12 w-full rounded-[12px] border border-line bg-paper px-3.5 text-[15px] text-ink outline-none transition-colors duration-180 focus:border-[1.5px] focus:border-monte focus:bg-surface"
      />
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-[12px] border border-line bg-surface shadow-[0_1px_2px_rgba(29,38,32,.06),0_8px_24px_-8px_rgba(29,38,32,.18)]">
          {effectiveCities.map((city) => (
            <button
              key={city.id}
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-sand first:rounded-t-[12px] last:rounded-b-[12px]"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(`${city.name}, ${city.province}`);
                onSelectCity(city);
                setIsOpen(false);
              }}
            >
              <MapPin className="size-[14px] shrink-0 text-ink-2" strokeWidth={1.75} />
              <div>
                <p className="text-[15px] font-medium text-ink">{city.name}</p>
                <p className="text-[13px] text-ink-2">{city.province}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
