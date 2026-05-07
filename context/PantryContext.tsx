import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_PANTRY = '@shefv2/pantry';
const STORAGE_FRIDGE_IMAGE = '@shefv2/fridge-image';

export type PantryItem = {
  id: string;
  name: string;
  addedAt: number;
  sourceImageUri: string | null;
};

type PantryContextValue = {
  fridgeImageUri: string | null;
  setFridgeImageUri: (uri: string | null) => void;
  items: PantryItem[];
  addIngredientsFromText: (text: string) => void;
  removeItem: (id: string) => void;
};

const PantryContext = createContext<PantryContextValue | null>(null);

function splitIngredientLines(text: string): string[] {
  return text
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function PantryProvider({ children }: { children: React.ReactNode }) {
  const [fridgeImageUri, setFridgeImageUriState] = useState<string | null>(null);
  const [items, setItems] = useState<PantryItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [rawItems, rawImage] = await Promise.all([
          AsyncStorage.getItem(STORAGE_PANTRY),
          AsyncStorage.getItem(STORAGE_FRIDGE_IMAGE),
        ]);
        if (cancelled) return;
        if (rawItems) {
          const parsed = JSON.parse(rawItems) as PantryItem[];
          if (Array.isArray(parsed)) setItems(parsed);
        }
        if (rawImage) setFridgeImageUriState(rawImage);
      } catch {
        /* ignore corrupt storage */
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_PANTRY, JSON.stringify(items)).catch(() => {});
  }, [items, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (fridgeImageUri) {
      AsyncStorage.setItem(STORAGE_FRIDGE_IMAGE, fridgeImageUri).catch(() => {});
    } else {
      AsyncStorage.removeItem(STORAGE_FRIDGE_IMAGE).catch(() => {});
    }
  }, [fridgeImageUri, hydrated]);

  const setFridgeImageUri = useCallback((uri: string | null) => {
    setFridgeImageUriState(uri);
  }, []);

  const addIngredientsWithSource = useCallback((text: string, sourceUri: string | null) => {
    const parts = splitIngredientLines(text);
    if (parts.length === 0) return;

    setItems((prev) => {
      const existingLower = new Set(prev.map((i) => i.name.toLowerCase()));
      const now = Date.now();
      const additions: PantryItem[] = [];
      for (const part of parts) {
        const name = normalizeName(part);
        if (!name) continue;
        const key = name.toLowerCase();
        if (existingLower.has(key)) continue;
        existingLower.add(key);
        additions.push({
          id: `${now}-${Math.random().toString(36).slice(2, 9)}`,
          name,
          addedAt: now,
          sourceImageUri: sourceUri,
        });
      }
      return [...additions, ...prev];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      fridgeImageUri,
      setFridgeImageUri,
      items,
      addIngredientsFromText: (text: string) =>
        addIngredientsWithSource(text, fridgeImageUri),
      removeItem,
    }),
    [fridgeImageUri, setFridgeImageUri, items, addIngredientsWithSource, removeItem]
  );

  return <PantryContext.Provider value={value}>{children}</PantryContext.Provider>;
}

export function usePantry() {
  const ctx = useContext(PantryContext);
  if (!ctx) {
    throw new Error('usePantry must be used within PantryProvider');
  }
  return ctx;
}
