"use client";

import { useMemo, useRef, useState } from "react";
import { useClickOutside } from "@/hooks/useClickOutside";
import type { IndexedFeature } from "@/hooks/useGeoIndex";
import type { LevelId } from "@/types/map";
import { SearchIcon } from "./icons";

interface SearchBoxProps {
  bairros: IndexedFeature[];
  loteamentos: IndexedFeature[];
  onPreview: (feature: IndexedFeature | null) => void;
  onSelect: (level: LevelId, name: string) => void;
  className?: string;
  placeholder?: string;
}

/**
 * Map Search Bar Engine. Search for neightborhoods and districts.
*/
export function SearchBox({
  bairros,
  loteamentos,
  onPreview,
  onSelect,
  className,
  placeholder = "Buscar bairro ou loteamento...",
}: SearchBoxProps) {

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return [];
    }

    return [...bairros, ...loteamentos]
      .filter((feature) => feature.name.toLowerCase().includes(normalizedQuery))
      .slice(0, 20);
  }, [query, bairros, loteamentos]);

  const handleSelect = (feature: IndexedFeature) => {
    onPreview(null);
    onSelect(feature.level, feature.name);
    setQuery("");
    setOpen(false);
  };

  const handleChange = (value: string) => {
    setQuery(value);
    setOpen(value.trim().length > 0);
  };

  useClickOutside(rootRef, open, setOpen);

  const showResults = open && matches.length > 0;

  return (
    <div ref={rootRef} className={className}>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
        <input
          type="text"
          value={query}
          onChange={(event) => handleChange(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          aria-label="Buscar bairro ou loteamento"
          aria-expanded={showResults}
          className="w-full rounded-[22px] border border-cv-border bg-panel py-2.5 pl-10 pr-4 text-[15px] text-ink placeholder:text-ink-faint placeholder:italic focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        />
      </div>

      {showResults && (
        <div
          role="listbox"
          className="mt-1.5 max-h-[60vh] overflow-y-auto rounded-[10px] border border-cv-border bg-panel shadow-[0_6px_20px_rgba(0,0,0,.12)]"
        >
          {matches.map((feature) => (
            <SearchResult
              key={`${feature.level}-${feature.name}`}
              feature={feature}
              onPreview={onPreview}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface SearchResultProps {
  feature: IndexedFeature;
  onPreview: (feature: IndexedFeature | null) => void;
  onSelect: (feature: IndexedFeature) => void;
}

function SearchResult({ feature, onPreview, onSelect }: SearchResultProps) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter") {
      onSelect(feature);
      return;
    }

    if (event.key === "Escape") {
      onPreview(null);
    }
  };

  return (
    <div
      role="option"
      aria-selected={false}
      tabIndex={0}
      onMouseEnter={() => onPreview(feature)}
      onMouseLeave={() => onPreview(null)}
      onFocus={() => onPreview(feature)}
      onBlur={() => onPreview(null)}
      onClick={() => onSelect(feature)}
      onKeyDown={handleKeyDown}
      className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3.5 py-2 text-sm hover:bg-panel-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
    >
      <span>{feature.name}</span>

      <span className="cv-note-body text-[10.5px] not-italic text-ink-soft">
        {feature.level === "bairro" ? "Bairro" : "Loteamento"}
      </span>
    </div>
  );
}