import type { NormalizedContent } from "./types";

const NASA_APOD_ENDPOINT = "https://science.nasa.gov/wp-json/wp/v2/apod-basic";
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export interface NasaApod {
  date?: string;
  post_id?: number;
  title?: string;
  permalink?: string;
  media_type?: "image" | "video" | string;
  explanation?: string;
  credit?: string;
  copyright?: string;
  alt?: string;
  url?: string;
  hdurl?: string;
  basic_html_url?: string;
}

export interface NasaApodQuery {
  date?: string;
  startDate?: string;
  endDate?: string;
  count?: number;
  apiKey?: string;
  timeoutMs?: number;
}

const cache = new Map<string, { expiresAt: number; items: NormalizedContent[] }>();

function absoluteHttpUrl(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function toArray(payload: NasaApod | NasaApod[]): NasaApod[] {
  return Array.isArray(payload) ? payload : [payload];
}

function normalize(item: NasaApod): NormalizedContent | null {
  const externalId = item.date ?? (item.post_id ? String(item.post_id) : "");
  const title = item.title?.trim();
  const sourceUrl = absoluteHttpUrl(item.permalink ?? item.url);

  if (!externalId || !title || !sourceUrl) return null;

  const mediaType = item.media_type === "video" ? "video" : "image";
  const mediaUrl =
    mediaType === "image"
      ? absoluteHttpUrl(item.hdurl ?? item.url ?? item.permalink)
      : absoluteHttpUrl(item.url ?? item.permalink);

  return {
    id: `nasa:apod:${externalId}`,
    source: "nasa",
    externalId,
    mediaType,
    title,
    description: item.explanation?.trim(),
    mediaUrl,
    thumbnailUrl: mediaType === "image" ? mediaUrl : undefined,
    sourceUrl,
    author: item.credit?.trim(),
    publishedAt: item.date,
    rights: item.copyright ? "copyright-noted-by-nasa" : "nasa-apod-rights-unspecified",
    attribution: item.copyright?.trim() ?? item.credit?.trim() ?? "NASA APOD",
    tags: ["NASA", "APOD", "Espaço", "Astronomia"],
    metadata: {
      postId: item.post_id,
      alt: item.alt,
      copyright: item.copyright,
      basicHtmlUrl: item.basic_html_url,
      api: "science.nasa.gov/wp-json/wp/v2/apod-basic",
    },
    cachedAt: new Date().toISOString(),
  };
}

function cacheKey(query: NasaApodQuery): string {
  return JSON.stringify({
    date: query.date ?? "",
    startDate: query.startDate ?? "",
    endDate: query.endDate ?? "",
    count: query.count ?? 0,
  });
}

export async function fetchNasaApod(query: NasaApodQuery = {}): Promise<NormalizedContent[]> {
  if (query.date && (query.startDate || query.endDate || query.count)) {
    throw new Error("date não pode ser combinado com startDate, endDate ou count.");
  }

  if (query.startDate && query.endDate && query.startDate > query.endDate) {
    throw new Error("startDate não pode ser posterior a endDate.");
  }

  if (query.count !== undefined && (!Number.isInteger(query.count) || query.count < 1 || query.count > 25)) {
    throw new Error("count deve estar entre 1 e 25.");
  }

  const key = cacheKey(query);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.items;

  const url = new URL(NASA_APOD_ENDPOINT);
  if (query.date) url.searchParams.set("date", query.date);
  if (query.startDate) url.searchParams.set("start_date", query.startDate);
  if (query.endDate) url.searchParams.set("end_date", query.endDate);
  if (query.count) url.searchParams.set("count", String(query.count));
  url.searchParams.set("api_key", query.apiKey ?? "DEMO_KEY");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), query.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`NASA APOD respondeu HTTP ${response.status}.`);
    }

    const payload = (await response.json()) as NasaApod | NasaApod[];
    const items = toArray(payload)
      .map(normalize)
      .filter((item): item is NormalizedContent => item !== null);

    cache.set(key, {
      items,
      expiresAt: Date.now() + DEFAULT_CACHE_TTL_MS,
    });

    return items;
  } finally {
    clearTimeout(timeout);
  }
}

export function clearNasaApodCache(): void {
  cache.clear();
}
