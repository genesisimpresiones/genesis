import { GENESIS_CATALOG } from './catalog-data.js';
import { GENESIS_CACHED_CATALOG } from './catalog-cache.js';
import { searchTerms, sortBySearchRelevance } from './search-intent.js';

const API_URL = window.GENESIS_BAMBU_API_URL ?? '/api/catalog';
const MAX_CACHED_PAGES = 20;
const pageCache = new Map();

export async function loadCatalog(query = '', page = 1) {
  const cleanQuery = query.trim();
  const cacheKey = `${cleanQuery.toLocaleLowerCase()}|${page}`;
  if (pageCache.has(cacheKey)) return pageCache.get(cacheKey);

  try {
    const url = new URL(API_URL, window.location.origin);
    if (cleanQuery) url.searchParams.set('q', cleanQuery);
    url.searchParams.set('limit', '20');
    url.searchParams.set('page', String(page));
    url.searchParams.set('sort', 'likes');

    const response = await fetch(url, { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`Bambu API returned ${response.status}`);
    const payload = await response.json();
    const result = {
      items: normalizeBambuItems(payload).slice(0, 20),
      page: Number(payload.page ?? page),
      totalPages: Math.min(Number(payload.totalPages ?? 5), 5),
      pageSize: 20,
    };
    storePage(cacheKey, result);
    return result;
  } catch (error) {
    console.warn('[genesis] Falling back to local catalog', error);
    const result = { items: filterLocal(cleanQuery, page), page, totalPages: 5, pageSize: 20 };
    storePage(cacheKey, result);
    return result;
  }
}

export function prefetchCatalogPage(query = '', page = 1) {
  if (page > 5) return;
  void loadCatalog(query, page).catch(() => undefined);
}

function storePage(cacheKey, result) {
  pageCache.set(cacheKey, result);
  while (pageCache.size > MAX_CACHED_PAGES) pageCache.delete(pageCache.keys().next().value);
}

function filterLocal(query, page) {
  const catalog = GENESIS_CACHED_CATALOG.length > 0 ? GENESIS_CACHED_CATALOG : GENESIS_CATALOG;
  const words = searchTerms(query);
  if (words.length === 0) return catalog.slice((page - 1) * 20, page * 20);
  const matches = catalog.filter((item) => {
    const haystack = `${item.title} ${item.category} ${item.creator ?? ''} ${item.description}`.toLowerCase();
    return words.some((word) => haystack.includes(word));
  });
  const ranked = sortBySearchRelevance(matches.length ? matches : catalog, query);
  return ranked.slice((page - 1) * 20, page * 20);
}

function normalizeBambuItems(payload) {
  if (payload?.ok === false) return [];
  const items = Array.isArray(payload) ? payload : payload.items ?? payload.results ?? [];
  return items.map((item, index) => ({
    id: String(item.id ?? item.modelId ?? `bambu-${index}`),
    rank: index + 1,
    title: String(item.title ?? item.name ?? 'Modelo sin titulo'),
    category: String(item.category ?? item.type ?? 'Bambu'),
    creator: String(item.creator ?? item.creatorName ?? item.designCreator?.name ?? ''),
    likes: Number(item.likes ?? item.likeCount ?? item.hotScore ?? 0),
    downloads: Number(item.downloads ?? item.downloadCount ?? item.printCount ?? 0),
    cover: item.coverImage ?? item.cover ?? item.image ?? 'fallback',
    slides: item.slides ?? item.images ?? item.gallery ?? [item.coverImage ?? item.cover ?? item.image].filter(Boolean),
    description: String(item.description ?? item.summary ?? 'Modelo destacado del catalogo Bambu.'),
    sourceUrl: item.url ?? item.sourceUrl ?? item.modelUrl,
  }));
}
