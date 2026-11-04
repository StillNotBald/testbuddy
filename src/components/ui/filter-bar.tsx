'use client';

import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from './button';
import { Checkbox } from './checkbox';
import { Input } from './form';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

export interface FacetDef {
  key: string;
  label: string;
  options: Array<{ value: string; label: string }>;
}
export type FacetValue = Record<string, string[]>;

export interface FilterBarProps {
  search?: { value: string; onChange: (v: string) => void; placeholder?: string };
  facets: FacetDef[];
  value: FacetValue;
  onChange: (next: FacetValue) => void;
  resultCount?: number;
}

/**
 * Search + facet filters. Pure controlled component: wire `value`/`onChange` to `useUrlState`
 * (comma lists via `url.getList` / `url.set`) so filters live in the URL.
 */
export function FilterBar({ search, facets, value, onChange, resultCount }: FilterBarProps) {
  const chips = facets.flatMap((f) => (value[f.key] ?? []).map((v) => ({ facet: f, v, label: f.options.find((o) => o.value === v)?.label ?? v })));
  const toggle = (key: string, v: string) => {
    const cur = value[key] ?? [];
    onChange({ ...value, [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
  };
  return (
    <div className="space-y-2" role="search">
      <div className="flex flex-wrap items-center gap-2">
        {search ? (
          <div className="relative min-w-48 flex-1 sm:max-w-xs">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-muted" />
            <Input aria-label={search.placeholder ?? 'Search'} type="search" value={search.value} onChange={(e) => search.onChange(e.target.value)} placeholder={search.placeholder ?? 'Search'} className="pl-8" />
          </div>
        ) : null}
        {facets.length > 0 ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" iconLeft={<SlidersHorizontal className="size-4" aria-hidden />}>Filters{chips.length ? ` (${chips.length})` : ''}</Button>
            </PopoverTrigger>
            <PopoverContent className="max-h-96 w-80 space-y-4 overflow-auto p-3">
              {facets.map((f) => (
                <fieldset key={f.key}>
                  <legend className="mb-1 text-sm font-medium text-ink">{f.label}</legend>
                  <div className="space-y-1">
                    {f.options.map((o) => {
                      const id = `facet-${f.key}-${o.value}`;
                      return (
                        <div key={o.value} className="flex items-center gap-2">
                          <Checkbox id={id} checked={(value[f.key] ?? []).includes(o.value)} onCheckedChange={() => toggle(f.key, o.value)} />
                          <label htmlFor={id} className="text-base text-ink">{o.label}</label>
                        </div>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </PopoverContent>
          </Popover>
        ) : null}
        {resultCount !== undefined ? <span className="text-sm text-ink-muted tabular-nums" aria-live="polite">{resultCount} {resultCount === 1 ? 'result' : 'results'}</span> : null}
      </div>
      {chips.length > 0 ? (
        <ul className="flex flex-wrap items-center gap-1.5" aria-label="Active filters">
          {chips.map((c) => (
            <li key={`${c.facet.key}:${c.v}`} className="inline-flex items-center gap-1 rounded-xs bg-selected py-0.5 pr-0.5 pl-2 text-sm text-accent-text">
              {c.facet.label}: {c.label}
              <button type="button" aria-label={`Remove filter ${c.facet.label}: ${c.label}`} onClick={() => toggle(c.facet.key, c.v)} className="rounded-xs p-0.5 hover:bg-subtle"><X className="size-3.5" aria-hidden /></button>
            </li>
          ))}
          <li><Button size="sm" variant="ghost" onClick={() => onChange(Object.fromEntries(facets.map((f) => [f.key, []])))}>Clear all</Button></li>
        </ul>
      ) : null}
    </div>
  );
}
