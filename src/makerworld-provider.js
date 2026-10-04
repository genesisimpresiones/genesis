import { expandSearchQuery, scoreCatalogItem, sortBySearchRelevance } from './search-intent.js';

const catalogCache = new Map();
const CATALOG_CACHE_TTL_MS = 45_000;
const ENRICH_CONCURRENCY = 4;
const CATALOG_TOTAL_PAGES = 5;

export async function fetchMakerWorldCatalog({
  token,
  query = '',
  limit = 20,
  baseUrl = 'https://api.bambulab.com/v1',
  navKey = 'Trending',
  enrich = true,
  page = 1,
}) {
  if (!token) throw new Error('GENESIS_MAKERWORLD_TOKEN is required');
  const safePage = Math.min(Math.max(Number(page) || 1, 1), CATALOG_TOTAL_PAGES);
  const endpoint = new URL(query ? `${baseUrl}/search-service/select/design2` : `${baseUrl}/search-service/select/design/nav`);
  const cacheKey = `${query.trim().toLocaleLowerCase()}|${limit}|${navKey}|${safePage}`;
  const cached = catalogCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  let items = [];

  if (query) {
    const variants = expandSearchQuery(query);
    const offset = (safePage - 1) * limit;
    const exactItems = await fetchSearchItems({ token, baseUrl, query, limit, offset });
    const resultSets = [exactItems];
    if (exactItems.length < limit) {
      for (const variant of variants.slice(1)) {
        resultSets.push(await fetchSearchItems({ token, baseUrl, query: variant, limit, offset }));
        if (mergeCatalogItems(...resultSets).length >= limit) break;
      }
    }
    items = sortBySearchRelevance(mergeCatalogItems(...resultSets), query);
  } else {
    endpoint.searchParams.set('navKey', navKey);
    endpoint.searchParams.set('offset', String((safePage - 1) * limit));
    endpoint.searchParams.set('limit', String(limit));
    items = normalizeMakerWorldItems(await fetchJson({ endpoint, token })).slice(0, limit);
  }

  if (query && items.length < limit) {
    const fillItems = await fetchTrendingFill({ token, baseUrl, navKey, limit: limit + 5, offset: (safePage - 1) * limit });
    items = mergeCatalogItems(items, fillItems);
  }
  if (enrich) items = await enrichMakerWorldItems({ items, token, baseUrl });
  items = items
    .filter(hasRemoteVisual)
    .sort((a, b) => (query ? sortPairByQuery(a, b, query) : 0))
    .slice(0, limit)
    .map((item, index) => ({ ...item, rank: index + 1 }));
  if (items.length === 0) throw new Error('MakerWorld API returned no catalog items');
  const value = { endpoint: endpoint.toString(), items, page: safePage, totalPages: CATALOG_TOTAL_PAGES };
  catalogCache.set(cacheKey, { expiresAt: Date.now() + CATALOG_CACHE_TTL_MS, value });
  return value;
}

async function fetchSearchItems({ token, baseUrl, query, limit, offset }) {
  const endpoint = new URL(`${baseUrl}/search-service/select/design2`);
  endpoint.searchParams.set('keyword', query);
  endpoint.searchParams.set('offset', String(offset));
  endpoint.searchParams.set('limit', String(limit));
  try {
    return normalizeMakerWorldItems(await fetchJson({ endpoint, token })).slice(0, limit);
  } catch {
    return [];
  }
}

async function fetchJson({ endpoint, token }) {
  const response = await fetch(endpoint, {
    headers: {
      accept: 'application/json',
      'accept-language': 'es-ES,es;q=0.9,en;q=0.8',
      authorization: `Bearer ${token}`,
      'user-agent': 'GenesisLanding/0.1 (+https://github.com/Doridian/OpenBambuAPI)',
    },
  });
  if (!response.ok) throw new Error(`MakerWorld API returned ${response.status}`);
  return response.json();
}

async function fetchTrendingFill({ token, baseUrl, navKey, limit, offset }) {
  const endpoint = new URL(`${baseUrl}/search-service/select/design/nav`);
  endpoint.searchParams.set('navKey', navKey);
  endpoint.searchParams.set('offset', String(offset));
  endpoint.searchParams.set('limit', String(limit));
  const response = await fetch(endpoint, {
    headers: {
      accept: 'application/json',
      'accept-language': 'es-ES,es;q=0.9,en;q=0.8',
      authorization: `Bearer ${token}`,
      'user-agent': 'GenesisLanding/0.1 (+https://github.com/Doridian/OpenBambuAPI)',
    },
  });
  if (!response.ok) return [];
  return normalizeMakerWorldItems(await response.json());
}

function mergeCatalogItems(...groups) {
  const seen = new Set();
  const merged = [];
  for (const item of groups.flat()) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push({ ...item, rank: merged.length + 1 });
  }
  return merged;
}

async function enrichMakerWorldItems({ items, token, baseUrl }) {
  const enriched = [];
  for (let index = 0; index < items.length; index += ENRICH_CONCURRENCY) {
    const batch = items.slice(index, index + ENRICH_CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (item) => {
        try {
          return await enrichMakerWorldItem({ item, token, baseUrl });
        } catch {
          return item;
        }
      }),
    );
    enriched.push(...results);
  }
  return enriched;
}

async function enrichMakerWorldItem({ item, token, baseUrl }) {
  const endpoint = new URL(`${baseUrl}/design-service/design/${encodeURIComponent(item.id)}`);
  const response = await fetch(endpoint, {
    headers: {
      accept: 'application/json',
      'accept-language': 'es-ES,es;q=0.9,en;q=0.8',
      authorization: `Bearer ${token}`,
      'user-agent': 'GenesisLanding/0.1 (+https://github.com/Doridian/OpenBambuAPI)',
    },
  });
  if (!response.ok) throw new Error(`MakerWorld design detail returned ${response.status}`);
  const detail = await response.json();
  const detailImages = imageList({
    cover: detail.coverUrl,
    coverImage: detail.coverLandscape,
    images: [
      detail.coverUrl,
      detail.coverLandscape,
      detail.coverPortrait,
      detail.designExtension?.real_pictures,
      detail.designExtension?.design_pictures,
      detail.instances?.map((instance) => [instance.cover, instance.pictures]),
    ],
  });
  const slides = uniqueUrls([...detailImages, ...(item.slides ?? []), item.cover]).slice(0, 8);
  return {
    ...item,
    title: item.title || detail.title || detail.titleTranslated || 'Modelo MakerWorld',
    category: detail.categories?.[0]?.name ?? item.category,
    creator: detail.designCreator?.name ?? detail.designCreator?.handle ?? item.creator,
    likes: Number(detail.likeCount ?? item.likes ?? 0),
    downloads: Number(detail.printCount ?? detail.downloadCount ?? item.downloads ?? 0),
    cover: firstUrl(detail.coverUrl, detail.coverLandscape, item.cover) ?? item.cover,
    slides: slides.length ? slides : item.slides,
    description: cleanSummary(detail.summary || detail.summaryTranslated || item.description),
    sourceUrl: detail.id ? `https://makerworld.com/models/${detail.id}` : item.sourceUrl,
  };
}

export function normalizeMakerWorldItems(payload) {
  const candidates = findArrays(payload)
    .filter((items) => items.some((item) => item && typeof item === 'object' && looksLikeDesign(item)))
    .sort((a, b) => designRecordCount(b) - designRecordCount(a) || b.length - a.length);
  const items = candidates[0] ?? [];
  return items.map((raw, index) => {
    const creator = raw.designCreator ?? raw.creator ?? raw.user ?? raw.owner ?? {};
    const images = imageList(raw);
    return {
      id: String(raw.id ?? raw.designId ?? raw.modelId ?? raw.design?.id ?? `makerworld-${index}`),
      rank: index + 1,
      title: String(raw.title ?? raw.name ?? raw.designTitle ?? raw.subject ?? 'Modelo MakerWorld'),
      category: String(raw.category?.name ?? raw.categoryName ?? raw.type ?? raw.navName ?? 'MakerWorld'),
      creator: creator.name ?? creator.handle ?? raw.creatorName ?? '',
      likes: Number(raw.likeCount ?? raw.likes ?? raw.hotScore ?? raw.favoriteCount ?? 0),
      downloads: Number(raw.downloadCount ?? raw.downloads ?? raw.printCount ?? raw.instanceCount ?? 0),
      cover: firstUrl(raw.cover, raw.coverImage, raw.image, raw.thumbnail, raw.coverUrl, images[0]) ?? 'fallback',
      slides: images.length ? images : [firstUrl(raw.cover, raw.coverImage, raw.image, raw.thumbnail)].filter(Boolean),
      description: String(raw.description ?? raw.summary ?? raw.introduction ?? 'Modelo destacado de MakerWorld.'),
      sourceUrl:
        raw.url ??
        raw.sourceUrl ??
        raw.modelUrl ??
        (raw.id || raw.designId ? `https://makerworld.com/models/${raw.id ?? raw.designId}` : undefined),
    };
  });
}

function findArrays(value, found = []) {
  if (Array.isArray(value)) {
    found.push(value);
    for (const item of value) findArrays(item, found);
    return found;
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) findArrays(item, found);
  }
  return found;
}

function looksLikeDesign(item) {
  return Boolean(
    (item.id ?? item.designId ?? item.modelId) && (item.title ?? item.name ?? item.designTitle),
  );
}

function designRecordCount(items) {
  return items.filter((item) => item && typeof item === 'object' && looksLikeDesign(item)).length;
}

function imageList(raw) {
  const values = [
    raw.images,
    raw.gallery,
    raw.pictures,
    raw.coverImages,
    raw.design?.images,
    raw.design?.pictures,
  ].flatMap((value) => (Array.isArray(value) ? value : value ? [value] : []));
  return values.map((value) => firstUrl(value)).filter(Boolean);
}

function firstUrl(...values) {
  for (const value of values) {
    if (!value) continue;
    if (Array.isArray(value)) {
      const nested = firstUrl(...value);
      if (nested) return nested;
    }
    if (typeof value === 'string' && /^https?:\/\//.test(value)) return value;
    if (typeof value === 'object') {
      const nested = firstUrl(
        value.url,
        value.src,
        value.image,
        value.thumbnail,
        value.cover,
        value.picUrl,
        value.pictureUrl,
        value.large,
        value.middle,
      );
      if (nested) return nested;
    }
  }
  return null;
}

function uniqueUrls(values) {
  return [...new Set(values.filter((value) => typeof value === 'string' && /^https?:\/\//.test(value)))];
}

function hasRemoteVisual(item) {
  return /^https?:\/\//.test(item.cover ?? '') || (item.slides ?? []).some((slide) => /^https?:\/\//.test(slide));
}

function sortPairByQuery(a, b, query) {
  return scoreCatalogItem(b, query) - scoreCatalogItem(a, query);
}

function cleanSummary(value) {
  const text = String(value ?? '')
    .replace(/<img\b[^>]*>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return 'Modelo destacado de MakerWorld.';
  return text.length > 360 ? `${text.slice(0, 357).trim()}...` : text;
}
