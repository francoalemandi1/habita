"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CityResult {
  id: string;
  name: string;
  province: string;
  latitude?: number;
  longitude?: number;
}

interface CityTypeaheadProps {
  value: string;
  onChange: (value: string) => void;
  onSelectCity: (city: CityResult) => void;
  placeholder?: string;
  className?: string;
}

export function CityTypeahead({ value, onChange, onSelectCity, placeholder = "Buscar ciudad...", className }: CityTypeaheadProps) {
  const [cities, setCities] = useState<CityResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (value.length < 2) {
      setCities([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/cities?q=${encodeURIComponent(value)}`);
        if (res.ok) {
          const data = (await res.json()) as { cities: CityResult[] };
          setCities(data.cities);
          setIsOpen(true);
        }
      } catch {
        setCities([]);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const showDropdown = isOpen && isFocused && cities.length > 0;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => {
          setIsFocused(true);
          if (cities.length > 0) setIsOpen(true);
        }}
        onBlur={() => {
          // Delay to allow click on dropdown item
          setTimeout(() => setIsFocused(false), 150);
        }}
        autoComplete="off"
        className="text-sm"
      />
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border border-border/50 bg-card shadow-lg">
          {cities.map((city) => (
            <button
              key={city.id}
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 first:rounded-t-xl last:rounded-b-xl"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(`${city.name}, ${city.province}`);
                onSelectCity(city);
                setIsOpen(false);
              }}
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{city.name}</p>
                <p className="text-xs text-muted-foreground">{city.province}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
