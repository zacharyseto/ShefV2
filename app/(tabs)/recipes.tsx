import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { usePantry } from '@/context/PantryContext';
import { useColorScheme } from '@/components/useColorScheme';

type RecipeCategory = 'parties' | 'balanced meals' | 'appetizers';

type Recipe = {
  id: string;
  title: string;
  category: RecipeCategory;
  ingredients: string[];
  steps: string[];
};

const CATEGORIES: RecipeCategory[] = ['parties', 'balanced meals', 'appetizers'];

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
  const { items } = usePantry();
  const [selectedCategory, setSelectedCategory] = useState<RecipeCategory>('balanced meals');
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);

  const pantrySet = useMemo(() => {
    return new Set(items.map((item) => item.name.toLowerCase()));
  }, [items]);

  const suggestions = useMemo(() => {
    const inCategory = HARD_CODED_RECIPES.filter((recipe) => recipe.category === selectedCategory);
    return inCategory
      .map((recipe) => {
        const available = recipe.ingredients.filter((ing) => pantrySet.has(ing.toLowerCase()));
        return {
          recipe,
          availableCount: available.length,
          missing: recipe.ingredients.filter((ing) => !pantrySet.has(ing.toLowerCase())),
        };
      })
      .sort((a, b) => b.availableCount - a.availableCount);
  }, [pantrySet, selectedCategory]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Recipe Suggestions</Text>
      <Text style={styles.subtitle}>
        Suggestions are based on what is currently in your pantry. Choose a category to explore.
      </Text>

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

      {suggestions.map(({ recipe, availableCount, missing }) => {
        const isExpanded = expandedRecipeId === recipe.id;
        return (
          <View key={recipe.id} style={styles.card} lightColor="#f8fafc" darkColor="#18181b">
            <Pressable onPress={() => setExpandedRecipeId(isExpanded ? null : recipe.id)}>
              <Text style={styles.cardTitle}>{recipe.title}</Text>
              <Text style={styles.matchText}>
                Match: {availableCount}/{recipe.ingredients.length} ingredients in pantry
              </Text>
              {missing.length > 0 ? (
                <Text style={styles.missingText}>Missing: {missing.join(', ')}</Text>
              ) : (
                <Text style={styles.readyText}>You have everything for this recipe.</Text>
              )}
              <Text style={[styles.expandHint, { color: palette.tint }]}>
                {isExpanded ? 'Hide steps' : 'View steps'}
              </Text>
            </Pressable>

            {isExpanded ? (
              <View style={styles.stepsWrap} lightColor="transparent" darkColor="transparent">
                {recipe.steps.map((step, idx) => (
                  <Text key={`${recipe.id}-${idx}`} style={styles.stepText}>
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
