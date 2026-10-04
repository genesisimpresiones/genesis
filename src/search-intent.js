const QUERY_ALIASES = {
  maceta: ['planter', 'plant pot', 'pot', 'vase'],
  macetero: ['planter', 'plant pot', 'pot'],
  planta: ['plant', 'planter'],
  soporte: ['holder', 'stand', 'mount', 'bracket'],
  sosten: ['holder', 'stand'],
  celular: ['phone', 'mobile', 'iphone', 'smartphone'],
  telefono: ['phone', 'mobile', 'iphone', 'smartphone'],
  movil: ['phone', 'mobile'],
  funda: ['case', 'cover', 'shell'],
  carcasa: ['case', 'cover', 'shell'],
  organizador: ['organizer', 'storage', 'holder'],
  ordenar: ['organizer', 'storage'],
  escritorio: ['desk', 'desktop'],
  cocina: ['kitchen'],
  bano: ['bathroom'],
  baño: ['bathroom'],
  herramienta: ['tool'],
  herramientas: ['tools'],
  repuesto: ['replacement', 'spare part'],
  pieza: ['part'],
  caja: ['box', 'case'],
  tapa: ['lid', 'cover', 'cap'],
  bisagra: ['hinge'],
  gancho: ['hook'],
  clip: ['clip'],
  lampara: ['lamp', 'light'],
  lámpara: ['lamp', 'light'],
  luz: ['light'],
  led: ['led', 'light'],
  juguete: ['toy'],
  juguetes: ['toys'],
  articulado: ['articulated', 'flexi', 'flexible'],
  flexible: ['flexi', 'flexible'],
  dragon: ['dragon'],
  dragón: ['dragon'],
  calavera: ['skull', 'skeleton'],
  craneo: ['skull'],
  cráneo: ['skull'],
  halloween: ['halloween', 'spooky'],
  navidad: ['christmas'],
  mate: ['mate', 'cup', 'holder'],
  vaso: ['cup'],
  taza: ['mug', 'cup'],
  llavero: ['keychain', 'key ring'],
  decoracion: ['decoration', 'decor'],
  decoración: ['decoration', 'decor'],
  florero: ['vase'],
  auto: ['car', 'automotive'],
  coche: ['car', 'automotive'],
  gamer: ['gaming', 'gamer'],
};

export function expandSearchQuery(query) {
  const normalized = normalizeText(query);
  if (!normalized) return [];

  const words = normalized.split(/\s+/).filter(Boolean);
  const variants = new Set([query.trim(), normalized]);
  const aliasWords = [];

  for (const word of words) {
    const aliases = QUERY_ALIASES[word] ?? [];
    for (const alias of aliases) {
      variants.add(alias);
      aliasWords.push(alias);
    }
  }

  for (const alias of aliasWords.slice(0, 6)) {
    const phrase = words.map((word) => QUERY_ALIASES[word]?.[0] ?? word).join(' ');
    if (phrase && phrase !== normalized) variants.add(phrase);
    if (words.length === 2) variants.add(`${aliasWords[0] ?? words[0]} ${alias}`);
  }

  return [...variants]
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, array) => array.indexOf(item) === index)
    .slice(0, 6);
}

export function sortBySearchRelevance(items, query) {
  const terms = searchTerms(query);
  if (terms.length === 0) return items;
  return [...items].sort((a, b) => scoreCatalogItem(b, terms) - scoreCatalogItem(a, terms));
}

export function scoreCatalogItem(item, termsOrQuery) {
  const terms = Array.isArray(termsOrQuery) ? termsOrQuery : searchTerms(termsOrQuery);
  const originalQuery = Array.isArray(termsOrQuery) ? '' : normalizeText(termsOrQuery);
  if (terms.length === 0) return 0;
  const title = normalizeText(item.title);
  const category = normalizeText(item.category);
  const creator = normalizeText(item.creator);
  const description = normalizeText(item.description);
  const haystack = `${title} ${category} ${creator} ${description}`;
  let score = 0;
  let textScore = 0;
  for (const term of terms) {
    if (!term) continue;
    if (title.includes(term)) textScore += 12;
    if (category.includes(term)) textScore += 5;
    if (creator.includes(term)) textScore += 2;
    if (description.includes(term)) textScore += 2;
    if (haystack.includes(term)) textScore += 1;
  }
  if (textScore === 0) return 0;
  score += textScore;
  if (originalQuery && title.includes(originalQuery)) score += 60;
  score += Math.min(Number(item.likes ?? 0) / 1000, 3);
  score += Math.min(Number(item.downloads ?? 0) / 1000, 3);
  return score;
}

export function searchTerms(query) {
  return expandSearchQuery(query)
    .flatMap((variant) => normalizeText(variant).split(/\s+/))
    .filter((term) => term.length > 1)
    .filter((term, index, array) => array.indexOf(term) === index);
}

export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
