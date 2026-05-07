/** Loose matching between pantry names and recipe ingredient lines (quantities, plurals, extra words). */

const UNIT_PREFIX =
  /^[\d¼½¾⅓⅔]+(?:\/[\d¼½¾⅓⅔]+)?(?:\s*-\s*[\d¼½¾⅓⅔]+)?\s*(?:cup|cups|c\.|tbsp|tbs|tablespoons?|tsp|teaspoons?|oz|ounces?|lb|lbs|pounds?|g|grams?|kg|ml|l|cloves?|pieces?|slices?|sticks?|large|medium|small|whole|pinch|dash|can|cans)?\.?\s+/i;

export function normalizeIngredientPhrase(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripLeadingQuantity(phrase: string): string {
  let rest = normalizeIngredientPhrase(phrase);
  let prev = '';
  while (rest !== prev) {
    prev = rest;
    rest = rest.replace(UNIT_PREFIX, '').replace(/^[\d./\s]+/, '').trim();
  }
  rest = rest.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  return rest;
}

function morphVariants(term: string): string[] {
  const set = new Set<string>([term]);
  if (term.length > 4 && term.endsWith('ies')) set.add(term.slice(0, -3) + 'y');
  if (term.length > 4 && term.endsWith('es')) {
    const w = term.slice(0, -2);
    if (w.length >= 3) set.add(w);
  }
  if (term.length > 4 && term.endsWith('s') && !term.endsWith('ss')) set.add(term.slice(0, -1));
  return [...set];
}

/** True if this pantry item appears to be covered by the recipe line (or vice versa). */
export function pantryCoversRecipeLine(pantryNameLower: string, recipeIngredientLine: string): boolean {
  const pantry = normalizeIngredientPhrase(pantryNameLower);
  if (!pantry || pantry.length < 2) return false;

  const fullLine = normalizeIngredientPhrase(recipeIngredientLine);
  const core = stripLeadingQuantity(recipeIngredientLine);
  const haystacks = [core, fullLine].filter(Boolean);

  for (const haystack of haystacks) {
    if (haystack === pantry) return true;
    for (const pv of morphVariants(pantry)) {
      if (!pv) continue;
      if (haystack === pv) return true;
      const minSub = 3;
      if (pv.length >= minSub && haystack.includes(pv)) return true;
      if (haystack.length >= minSub && pv.includes(haystack)) return true;
    }
  }
  return false;
}

export function recipeLineCoveredByAnyPantry(recipeIngredientLine: string, pantryNamesLower: string[]): boolean {
  return pantryNamesLower.some((p) => pantryCoversRecipeLine(p, recipeIngredientLine));
}

export function partitionRecipeAgainstPantry(
  recipeIngredients: string[],
  pantryNamesLower: string[]
): { haveCount: number; missing: string[] } {
  const missing: string[] = [];
  let haveCount = 0;
  for (const line of recipeIngredients) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (recipeLineCoveredByAnyPantry(trimmed, pantryNamesLower)) haveCount += 1;
    else missing.push(trimmed);
  }
  return { haveCount, missing };
}
