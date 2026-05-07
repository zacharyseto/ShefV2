import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_PANTRY = '@shefv2/pantry';
const STORAGE_FRIDGE_IMAGE = '@shefv2/fridge-image';
const STORAGE_GROCERIES = '@shefv2/groceries';
const STORAGE_STAPLES = '@shefv2/staples';

export type PantryItem = {
  id: string;
  name: string;
  addedAt: number;
  sourceImageUri: string | null;
};

export type GroceryItem = {
  id: string;
  name: string;
  addedAt: number;
};

export type StapleItem = {
  id: string;
  name: string;
  addedAt: number;
};

type PantryContextValue = {
  fridgeImageUri: string | null;
  setFridgeImageUri: (uri: string | null) => void;
  items: PantryItem[];
  addIngredientsFromText: (text: string) => void;
  addIngredient: (name: string) => void;
  removeItem: (id: string) => void;
  groceryItems: GroceryItem[];
  addGroceryFromText: (text: string) => void;
  addGroceryItem: (name: string) => void;
  removeGroceryItem: (id: string) => void;
  stapleItems: StapleItem[];
  addStapleFromText: (text: string) => void;
  addStapleItem: (name: string) => void;
  removeStapleItem: (id: string) => void;
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
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([]);
  const [stapleItems, setStapleItems] = useState<StapleItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [rawItems, rawImage, rawGroceries, rawStaples] = await Promise.all([
          AsyncStorage.getItem(STORAGE_PANTRY),
          AsyncStorage.getItem(STORAGE_FRIDGE_IMAGE),
          AsyncStorage.getItem(STORAGE_GROCERIES),
          AsyncStorage.getItem(STORAGE_STAPLES),
        ]);
        if (cancelled) return;
        if (rawItems) {
          const parsed = JSON.parse(rawItems) as PantryItem[];
          if (Array.isArray(parsed)) setItems(parsed);
        }
        if (rawImage) setFridgeImageUriState(rawImage);
        if (rawGroceries) {
          const parsedGroceries = JSON.parse(rawGroceries) as GroceryItem[];
          if (Array.isArray(parsedGroceries)) setGroceryItems(parsedGroceries);
        }
        if (rawStaples) {
          const parsedStaples = JSON.parse(rawStaples) as StapleItem[];
          if (Array.isArray(parsedStaples)) setStapleItems(parsedStaples);
        }
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
    AsyncStorage.setItem(STORAGE_GROCERIES, JSON.stringify(groceryItems)).catch(() => {});
  }, [groceryItems, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_STAPLES, JSON.stringify(stapleItems)).catch(() => {});
  }, [stapleItems, hydrated]);

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

  const addGroceryFromText = useCallback((text: string) => {
    const parts = splitIngredientLines(text);
    if (parts.length === 0) return;
    setGroceryItems((prev) => {
      const existing = new Set(prev.map((item) => item.name.toLowerCase()));
      const now = Date.now();
      const additions: GroceryItem[] = [];
      for (const part of parts) {
        const name = normalizeName(part);
        if (!name) continue;
        const key = name.toLowerCase();
        if (existing.has(key)) continue;
        existing.add(key);
        additions.push({
          id: `${now}-${Math.random().toString(36).slice(2, 9)}`,
          name,
          addedAt: now,
        });
      }
      return [...additions, ...prev];
    });
  }, []);

  const removeGroceryItem = useCallback((id: string) => {
    setGroceryItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const addStapleFromText = useCallback((text: string) => {
    const parts = splitIngredientLines(text);
    if (parts.length === 0) return;
    setStapleItems((prev) => {
      const existing = new Set(prev.map((item) => item.name.toLowerCase()));
      const now = Date.now();
      const additions: StapleItem[] = [];
      for (const part of parts) {
        const name = normalizeName(part);
        if (!name) continue;
        const key = name.toLowerCase();
        if (existing.has(key)) continue;
        existing.add(key);
        additions.push({
          id: `${now}-${Math.random().toString(36).slice(2, 9)}`,
          name,
          addedAt: now,
        });
      }
      return [...additions, ...prev];
    });
  }, []);

  const removeStapleItem = useCallback((id: string) => {
    setStapleItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      fridgeImageUri,
      setFridgeImageUri,
      items,
      addIngredientsFromText: (text: string) =>
        addIngredientsWithSource(text, fridgeImageUri),
      addIngredient: (name: string) => addIngredientsWithSource(name, null),
      removeItem,
      groceryItems,
      addGroceryFromText,
      addGroceryItem: (name: string) => addGroceryFromText(name),
      removeGroceryItem,
      stapleItems,
      addStapleFromText,
      addStapleItem: (name: string) => addStapleFromText(name),
      removeStapleItem,
    }),
    [
      fridgeImageUri,
      setFridgeImageUri,
      items,
      addIngredientsWithSource,
      removeItem,
      groceryItems,
      addGroceryFromText,
      removeGroceryItem,
      stapleItems,
      addStapleFromText,
      removeStapleItem,
    ]
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
