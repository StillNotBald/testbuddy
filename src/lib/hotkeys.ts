'use client';

import { useEffect, useId, useRef, useSyncExternalStore } from 'react';

/* ---- single-key shortcuts setting (WCAG 2.1.4) ------------------------------------------------- */
const SETTING_KEY = 'testbuddy.singleKeyShortcuts';
const settingListeners = new Set<() => void>();
let memorySetting = true;

function readSetting(): boolean {
  try {
    const v = window.localStorage.getItem(SETTING_KEY);
    if (v !== null) return v !== '0';
  } catch {
    // storage unavailable: use memory value
  }
  return memorySetting;
}

export function setSingleKeyShortcuts(enabled: boolean): void {
  memorySetting = enabled;
  try { window.localStorage.setItem(SETTING_KEY, enabled ? '1' : '0'); } catch { /* memory only */ }
  settingListeners.forEach((l) => l());
}

export function useSingleKeyShortcuts(): boolean {
  return useSyncExternalStore(
    (cb) => { settingListeners.add(cb); return () => { settingListeners.delete(cb); }; },
    readSetting,
    () => true,
  );
}

/* ---- helpers ------------------------------------------------------------------------------------ */
export function isEditableTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  if (t.isContentEditable) return true;
  const tag = t.tagName;
  if (tag === 'INPUT') {
    const type = (t as HTMLInputElement).type;
    return !['checkbox', 'radio', 'button', 'submit', 'reset'].includes(type);
  }
  return tag === 'TEXTAREA' || tag === 'SELECT' || t.getAttribute('role') === 'textbox' || t.getAttribute('role') === 'combobox';
}

export type HotkeyHandler = (e: KeyboardEvent) => void;
export type HotkeyBinding = HotkeyHandler | { run: HotkeyHandler; label: string };
export type HotkeyMap = Record<string, HotkeyBinding>;

export interface ShortcutScope { id: string; scope: string; items: Array<{ keys: string; label: string }> }

/* ---- registry for the ? overlay ---------------------------------------------------------------- */
const registry = new Map<string, ShortcutScope>();
const regListeners = new Set<() => void>();
let snapshot: ShortcutScope[] = [];
function publish() { snapshot = [...registry.values()]; regListeners.forEach((l) => l()); }
export function useRegisteredShortcuts(): ShortcutScope[] {
  return useSyncExternalStore((cb) => { regListeners.add(cb); return () => { regListeners.delete(cb); }; }, () => snapshot, () => snapshot);
}

/* ---- matching ----------------------------------------------------------------------------------- */
const MODS = new Set(['mod', 'ctrl', 'alt', 'shift', 'meta']);

function parse(spec: string) {
  const parts = spec.toLowerCase().split('+');
  const key = parts[parts.length - 1] as string;
  const mods = new Set(parts.slice(0, -1).filter((p) => MODS.has(p)));
  return { key, mod: mods.has('mod') || mods.has('ctrl') || mods.has('meta'), alt: mods.has('alt'), shift: mods.has('shift') };
}

function matches(spec: string, e: KeyboardEvent): boolean {
  const p = parse(spec);
  const key = e.key.toLowerCase();
  const mod = e.ctrlKey || e.metaKey;
  if (p.mod !== mod || p.alt !== e.altKey) return false;
  const isLetter = /^[a-z]$/.test(p.key);
  if (isLetter && p.shift !== e.shiftKey) return false;
  if (p.key === 'escape') return key === 'escape';
  return key === p.key;
}

/** A spec is a "single-key" shortcut when it is one printable character (shift allowed) or a sequence of them. */
export function isSingleKeySpec(spec: string): boolean {
  return spec.split(' ').every((step) => {
    const p = parse(step);
    return !p.mod && !p.alt && p.key.length === 1;
  });
}

export interface UseHotkeysOptions { enabled?: boolean }

/**
 * Register hotkeys for a screen scope. Single-character shortcuts are ignored while typing, inside dialogs,
 * and when the user turned "Single-key shortcuts" off. Modifier combos (mod+s) and Escape always work
 * (Escape inside dialogs is left to the dialog). Sequences are written "g o".
 */
export function useHotkeys(scope: string, map: HotkeyMap, opts: UseHotkeysOptions = {}): void {
  const enabled = opts.enabled ?? true;
  const singleOn = useSingleKeyShortcuts();
  const mapRef = useRef(map);
  useEffect(() => { mapRef.current = map; });
  const seq = useRef<{ first: string; at: number } | null>(null);
  const reactId = useId();
  const id = useRef(`${scope}-${reactId}`);
  const keysSig = Object.keys(map).join('|');

  useEffect(() => {
    if (!enabled) return undefined;
    const items = Object.entries(mapRef.current).map(([keys, b]) => ({ keys, label: typeof b === 'function' ? '' : b.label })).filter((i) => i.label);
    registry.set(id.current, { id: id.current, scope, items });
    publish();
    const regId = id.current;
    return () => { registry.delete(regId); publish(); };
  }, [scope, enabled, keysSig]);

  useEffect(() => {
    if (!enabled) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing || e.repeat) return; // holding a key must act once
      const target = e.target;
      const inDialog = target instanceof HTMLElement && !!target.closest('[role="dialog"], [role="alertdialog"]');
      for (const [spec, binding] of Object.entries(mapRef.current)) {
        const run = typeof binding === 'function' ? binding : binding.run;
        const steps = spec.split(' ');
        const single = isSingleKeySpec(spec);
        if (single && (!singleOn || isEditableTarget(target) || inDialog)) continue;
        if (!single && inDialog && spec.toLowerCase() === 'escape') continue;
        if (steps.length === 2) {
          const [a, b] = steps as [string, string];
          const pending = seq.current;
          if (pending && pending.first === a && Date.now() - pending.at < 1200 && matches(b, e)) {
            seq.current = null;
            e.preventDefault();
            run(e);
            return;
          }
          if (matches(a, e)) { seq.current = { first: a, at: Date.now() }; return; }
          continue;
        }
        if (matches(spec, e)) {
          e.preventDefault();
          run(e);
          return;
        }
      }
      seq.current = null;
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [enabled, singleOn]);
}
