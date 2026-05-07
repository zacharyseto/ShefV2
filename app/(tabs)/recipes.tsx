import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
import { LayoutAnimation, Platform, Pressable, ScrollView, StyleSheet, UIManager } from 'react-native';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { usePantry } from '@/context/PantryContext';
import {
  AiRecipe,
  AiRecipeTitle,
  generateRecipeDetails,
  generateRecipeTitles,
  RecipeCategory,
} from '@/lib/ingredientVision';
import { partitionRecipeAgainstPantry } from '@/lib/recipePantryMatch';
import { useColorScheme } from '@/components/useColorScheme';

type Recipe = {
  id: string;
  title: string;
  category: RecipeCategory;
  ingredients: string[];
  steps: string[];
};

const CATEGORIES: RecipeCategory[] = ['parties', 'balanced meals', 'appetizers'];
const ENABLE_RECIPE_FALLBACK = false;
const RECIPE_TITLES_CACHE_KEY = '@shefv2/recipes-titles-cache-v1';
const RECIPE_DETAILS_CACHE_KEY = '@shefv2/recipes-details-cache-v1';

const HARD_CODED_RECIPES: Recipe[] = [
  {
    id: 'party-nachos',
    title: 'Loaded Party Nachos',
    category: 'parties',
    ingredients: ['cheddar cheese', 'tomatoes', 'onion', 'bell pepper'],
    steps: ['Layer chips and toppings.', 'Bake until cheese melts.', 'Serve warm.'],
  },
  {
    id: 'party-skewers',
    title: 'Chicken Veggie Skewers',
    category: 'parties',
    ingredients: ['chicken breast', 'bell pepper', 'onion', 'garlic'],
    steps: ['Cube and season chicken.', 'Skewer with veggies.', 'Grill until cooked through.'],
  },
  {
    id: 'balanced-scramble',
    title: 'Protein Veggie Scramble',
    category: 'balanced meals',
    ingredients: ['eggs', 'spinach', 'onion', 'bell pepper'],
    steps: ['Saute veggies.', 'Add beaten eggs.', 'Cook until softly set.'],
  },
  {
    id: 'balanced-bowl',
    title: 'Chicken and Greens Bowl',
    category: 'balanced meals',
    ingredients: ['chicken breast', 'spinach', 'tomatoes', 'garlic'],
    steps: ['Pan-sear chicken.', 'Toss greens and tomatoes.', 'Top bowl with sliced chicken.'],
  },
  {
    id: 'app-garlic-dip',
    title: 'Garlic Yogurt Dip',
    category: 'appetizers',
    ingredients: ['yogurt', 'garlic', 'onion'],
    steps: ['Mince garlic and onion.', 'Mix into yogurt.', 'Chill and serve.'],
  },
  {
    id: 'app-cheese-bites',
    title: 'Tomato Cheese Bites',
    category: 'appetizers',
    ingredients: ['cheddar cheese', 'tomatoes', 'garlic'],
    steps: ['Slice tomatoes.', 'Top with cheese and garlic.', 'Broil briefly.'],
  },
];

export default function RecipesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const { items, stapleItems, addGroceryFromText } = usePantry();
  const [selectedCategory, setSelectedCategory] = useState<RecipeCategory>('balanced meals');
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);
  const [recipeTitles, setRecipeTitles] = useState<Recipe[]>([]);
  const [recipeDetailsById, setRecipeDetailsById] = useState<Record<string, AiRecipe>>({});
  const [isLoadingTitles, setIsLoadingTitles] = useState(false);
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);
  const [preloadingDetailIds, setPreloadingDetailIds] = useState<Record<string, boolean>>({});
  const [usingFallback, setUsingFallback] = useState(false);
  const [titlesCache, setTitlesCache] = useState<Record<string, Recipe[]>>({});
  const [detailsCache, setDetailsCache] = useState<Record<string, AiRecipe>>({});
  const [addedRecipeIds, setAddedRecipeIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const pantrySignature = useMemo(
    () =>
      [...items.map((item) => item.name.toLowerCase().trim()), ...stapleItems.map((item) => item.name.toLowerCase().trim())]
        .sort((a, b) => a.localeCompare(b))
        .join('|'),
    [items, stapleItems]
  );

  const cacheKey = `${selectedCategory}::${pantrySignature}`;
  const pantryNamesLower = useMemo(
    () =>
      [...items.map((item) => item.name.toLowerCase().trim()), ...stapleItems.map((item) => item.name.toLowerCase().trim())].filter(
        Boolean
      ),
    [items, stapleItems]
  );

  useEffect(() => {
    AsyncStorage.getItem(RECIPE_TITLES_CACHE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as Record<string, Recipe[]>;
        if (parsed && typeof parsed === 'object') {
          setTitlesCache(parsed);
        }
      })
      .catch(() => {});
    AsyncStorage.getItem(RECIPE_DETAILS_CACHE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as Record<string, AiRecipe>;
        if (parsed && typeof parsed === 'object') {
          setDetailsCache(parsed);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(RECIPE_TITLES_CACHE_KEY, JSON.stringify(titlesCache)).catch(() => {});
  }, [titlesCache]);

  useEffect(() => {
    AsyncStorage.setItem(RECIPE_DETAILS_CACHE_KEY, JSON.stringify(detailsCache)).catch(() => {});
  }, [detailsCache]);

  useEffect(() => {
    const cached = titlesCache[cacheKey];
    if (cached) {
      setRecipeTitles(cached);
      setUsingFallback(false);
      return;
    }
    setRecipeTitles([]);
    setExpandedRecipeId(null);

    let cancelled = false;
    const pantryNames = [...items.map((item) => item.name), ...stapleItems.map((item) => item.name)].filter(Boolean);
    if (pantryNames.length === 0) {
      setRecipeTitles([]);
      setUsingFallback(ENABLE_RECIPE_FALLBACK);
      return;
    }

    async function run() {
      setIsLoadingTitles(true);
      try {
        const titles = await generateRecipeTitles(pantryNames, selectedCategory);
        if (cancelled) return;
        const normalized = titles.map((recipe: AiRecipeTitle, idx: number) => ({
          id: `ai-${selectedCategory}-${idx}-${recipe.title}`,
          title: recipe.title,
          category: recipe.category,
          ingredients: [],
          steps: [],
        }));
        setRecipeTitles(normalized);
        if (normalized.length > 0) {
          setTitlesCache((prev) => ({ ...prev, [cacheKey]: normalized }));
        }
        setUsingFallback(ENABLE_RECIPE_FALLBACK && normalized.length === 0);
      } catch {
        if (!cancelled) {
          setRecipeTitles([]);
          setUsingFallback(ENABLE_RECIPE_FALLBACK);
        }
      } finally {
        if (!cancelled) setIsLoadingTitles(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [items, stapleItems, selectedCategory, titlesCache, cacheKey]);

  useEffect(() => {
    let cancelled = false;
    const pantryNames = [...items.map((item) => item.name), ...stapleItems.map((item) => item.name)];
    if (recipeTitles.length === 0 || pantryNames.length === 0) return;

    async function preload() {
      const queue = [...recipeTitles];
      const workers = Math.min(3, queue.length);

      async function runWorker() {
        while (!cancelled && queue.length > 0) {
          const recipe = queue.shift();
          if (!recipe) return;
          const cacheDetailKey = `${selectedCategory}::${recipe.title.toLowerCase()}`;
          if (recipeDetailsById[recipe.id]) continue;

          const cached = detailsCache[cacheDetailKey];
          if (cached) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setRecipeDetailsById((prev) => ({ ...prev, [recipe.id]: cached }));
            continue;
          }

          setPreloadingDetailIds((prev) => ({ ...prev, [recipe.id]: true }));
          try {
            const detail = await generateRecipeDetails(pantryNames, selectedCategory, recipe.title);
            if (!detail || cancelled) continue;
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setRecipeDetailsById((prev) => ({ ...prev, [recipe.id]: detail }));
            setDetailsCache((prev) => ({ ...prev, [cacheDetailKey]: detail }));
          } catch {
            // keep moving so one failed detail does not block others
          } finally {
            if (!cancelled) {
              setPreloadingDetailIds((prev) => {
                const next = { ...prev };
                delete next[recipe.id];
                return next;
              });
            }
          }
        }
      }

      await Promise.all(Array.from({ length: workers }, () => runWorker()));
    }

    preload();
    return () => {
      cancelled = true;
    };
  }, [recipeTitles, items, stapleItems, selectedCategory, detailsCache]);

  async function onLoadRecipe(recipe: Recipe) {
    const cacheDetailKey = `${selectedCategory}::${recipe.title.toLowerCase()}`;
    const cached = detailsCache[cacheDetailKey];
    if (cached) {
      setRecipeDetailsById((prev) => ({ ...prev, [recipe.id]: cached }));
      setExpandedRecipeId(recipe.id);
      return;
    }
    setLoadingDetailId(recipe.id);
    try {
      const detail = await generateRecipeDetails(
        [...items.map((item) => item.name), ...stapleItems.map((item) => item.name)],
        selectedCategory,
        recipe.title
      );
      if (!detail) return;
      setRecipeDetailsById((prev) => ({ ...prev, [recipe.id]: detail }));
      setDetailsCache((prev) => ({ ...prev, [cacheDetailKey]: detail }));
      setExpandedRecipeId(recipe.id);
    } finally {
      setLoadingDetailId(null);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Recipe Suggestions</Text>
      <Text style={styles.subtitle}>
        Suggestions are based on what is currently in your pantry. Choose a category to explore.
      </Text>
      {isLoadingTitles ? <Text style={styles.badge}>Generating recipe titles...</Text> : null}
      {usingFallback ? <Text style={styles.badge}>Using fallback recipes.</Text> : null}
      {!usingFallback && !isLoadingTitles && recipeTitles.length === 0 ? (
        <Text style={styles.badge}>No AI recipes yet. Add pantry items and ensure API key is configured.</Text>
      ) : null}

      <View style={styles.chipsRow} lightColor="transparent" darkColor="transparent">
        {CATEGORIES.map((category) => {
          const active = selectedCategory === category;
          return (
            <Pressable
              key={category}
              onPress={() => {
                setSelectedCategory(category);
                setExpandedRecipeId(null);
              }}
              style={[
                styles.chip,
                active
                  ? { backgroundColor: palette.tint, borderColor: palette.tint }
                  : {
                      borderColor: colorScheme === 'dark' ? '#3f3f46' : '#d4d4d8',
                      backgroundColor: 'transparent',
                    },
              ]}>
              <Text style={[styles.chipText, active ? styles.chipTextActive : undefined]}>{category}</Text>
            </Pressable>
          );
        })}
      </View>

      {recipeTitles.map((recipe) => {
        const isExpanded = expandedRecipeId === recipe.id;
        const isAdded = !!addedRecipeIds[recipe.id];
        const detail = recipeDetailsById[recipe.id];
        const isPreloading = !!preloadingDetailIds[recipe.id];
        const ingredientLines = detail
          ? detail.ingredients.map((ing) => ing.trim()).filter(Boolean)
          : [];
        const { haveCount, missing } = detail
          ? partitionRecipeAgainstPantry(ingredientLines, pantryNamesLower)
          : { haveCount: 0, missing: [] };
        const ingredientTotal = ingredientLines.length;
        return (
          <View key={recipe.id} style={styles.card} lightColor="#f8fafc" darkColor="#18181b">
            <Pressable onPress={() => (detail ? setExpandedRecipeId(isExpanded ? null : recipe.id) : onLoadRecipe(recipe))}>
              <Text style={styles.cardTitle}>{recipe.title}</Text>
              {!detail ? (
                <View style={styles.missingWrap} lightColor="transparent" darkColor="transparent">
                  <Text style={styles.matchText}>Have --/-- ingredients</Text>
                  <Text style={styles.badgeInline}>
                    {loadingDetailId === recipe.id || isPreloading
                      ? 'Preparing recipe details...'
                      : 'Queued to preload recipe details...'}
                  </Text>
                </View>
              ) : missing.length > 0 ? (
                <View style={styles.missingWrap} lightColor="transparent" darkColor="transparent">
                  <Text style={styles.matchText}>
                    Have {haveCount}/{ingredientTotal} ingredients
                  </Text>
                  <Text style={styles.missingText}>Missing: {missing.join(', ')}</Text>
                  <Pressable
                    onPress={() => {
                      addGroceryFromText(missing.join(', '));
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
                      setAddedRecipeIds((prev) => ({ ...prev, [recipe.id]: true }));
                    }}
                    style={({ pressed }) => [
                      styles.addMissingButton,
                      {
                        backgroundColor: isAdded ? '#22c55e' : palette.tint,
                        opacity: pressed ? 0.85 : 1,
                        transform: [{ scale: isAdded ? 1.02 : 1 }],
                      },
                    ]}
                    disabled={isAdded}>
                    <Text style={styles.addMissingButtonText}>
                      {isAdded ? 'Added to groceries' : 'Add missing to groceries'}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.missingWrap} lightColor="transparent" darkColor="transparent">
                  <Text style={styles.matchText}>
                    Have {haveCount}/{ingredientTotal} ingredients
                  </Text>
                  <Text style={styles.readyText}>You have everything for this recipe.</Text>
                </View>
              )}
              {detail ? (
                <Text style={[styles.expandHint, { color: palette.tint }]}>
                  {isExpanded ? 'Hide steps' : 'View steps'}
                </Text>
              ) : null}
            </Pressable>

            {isExpanded && detail ? (
              <View style={styles.stepsWrap} lightColor="transparent" darkColor="transparent">
                {detail.steps.map((step, idx) => (
                  <Text key={`${recipe.id}-${idx}-detail`} style={styles.stepText}>
                    {idx + 1}. {step}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 30,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 14,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  badge: {
    fontSize: 13,
    marginBottom: 10,
    color: '#71717a',
  },
  badgeInline: {
    fontSize: 13,
    marginTop: 6,
    color: '#71717a',
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  chipText: {
    fontSize: 14,
    textTransform: 'capitalize',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  card: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  matchText: {
    fontSize: 14,
    marginBottom: 4,
  },
  missingText: {
    fontSize: 14,
    lineHeight: 20,
  },
  missingWrap: {
    marginTop: 2,
  },
  addMissingButton: {
    marginTop: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  addMissingButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  readyText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#22c55e',
  },
  expandHint: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '700',
  },
  stepsWrap: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#71717a',
  },
  stepText: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 4,
  },
});
