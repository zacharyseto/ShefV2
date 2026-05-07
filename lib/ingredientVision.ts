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
