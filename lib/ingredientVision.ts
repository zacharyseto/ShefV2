const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

function stripCodeFences(raw: string): string {
  return raw.replace(/```json|```/gi, '').trim();
}

export async function detectIngredientsFromBase64Image(base64: string): Promise<string[]> {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing EXPO_PUBLIC_OPENAI_API_KEY');
  }

  const body = {
    model: 'gpt-4o-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are a food vision assistant. Return only ingredients that are reasonably visible in the fridge photo. Exclude containers where the ingredient is unclear.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Extract visible ingredients. Return strict JSON: {"ingredients":["ingredient one","ingredient two"]}.',
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64}`,
            },
          },
        ],
      },
    ],
  };

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Vision request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    return [];
  }

  try {
    const parsed = JSON.parse(stripCodeFences(content));
    const ingredients = Array.isArray(parsed?.ingredients) ? parsed.ingredients : [];
    return ingredients
      .filter((item: unknown) => typeof item === 'string')
      .map((item: string) => item.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export type RecipeCategory = 'parties' | 'balanced meals' | 'appetizers';

export type AiRecipe = {
  title: string;
  category: RecipeCategory;
  ingredients: string[];
  steps: string[];
};

export async function generateRecipeSuggestions(
  pantryIngredients: string[],
  category: RecipeCategory
): Promise<AiRecipe[]> {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing EXPO_PUBLIC_OPENAI_API_KEY');
  }

  const body = {
    model: 'gpt-4o-mini',
    temperature: 0.4,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are a practical cooking assistant. Suggest realistic, easy recipes. Return strict JSON only.',
      },
      {
        role: 'user',
        content: `Using pantry ingredients: ${pantryIngredients.join(
          ', '
        )}\nGenerate 5 ${category} recipes. Return JSON exactly as {"recipes":[{"title":"...","category":"${category}","ingredients":["..."],"steps":["..."]}]}.`,
      },
    ],
  };

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Recipe request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') return [];

  try {
    const parsed = JSON.parse(stripCodeFences(content));
    const recipes = Array.isArray(parsed?.recipes) ? parsed.recipes : [];
    return recipes
      .filter(
        (r: unknown) =>
          typeof r === 'object' &&
          r !== null &&
          typeof (r as AiRecipe).title === 'string' &&
          Array.isArray((r as AiRecipe).ingredients) &&
          Array.isArray((r as AiRecipe).steps)
      )
      .map((r: AiRecipe) => ({
        title: r.title.trim(),
        category,
        ingredients: r.ingredients.map((i) => String(i).trim()).filter(Boolean),
        steps: r.steps.map((s) => String(s).trim()).filter(Boolean),
      }))
      .filter((r: AiRecipe) => r.title && r.ingredients.length > 0 && r.steps.length > 0);
  } catch {
    return [];
  }
}
