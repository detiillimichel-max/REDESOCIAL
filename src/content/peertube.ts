import type { NormalizedContent } from "./types";

export interface PeerTubeInstance { id: string; baseUrl: string; enabled: boolean; languages?: string[]; topics?: string[]; }
export interface PeerTubeQuery { count?: number; start?: number; search?: string; languageOneOf?: string[]; licenceOneOf?: number[]; sort?: "-publishedAt" | "-createdAt" | "-views" | "-trending" | "-hot" | "-best"; maxDurationSeconds?: number; }
export interface PeerTubeHealth { ok: boolean; baseUrl: string; version?: string; checkedAt: string; latencyMs: number; error?: string; }
export interface PeerTubeFetchOptions extends PeerTubeQuery { timeoutMs?: number; maxRetries?: number; retryBaseMs?: number; cacheTtlMs?: number; }

// Production catalog: the cpy.re test instance is intentionally excluded.
export const PEERTUBE_INSTANCES: PeerTubeInstance[] = [
  { id: "video-niboe", baseUrl: "https://video.niboe.info", enabled: true },
  { id: "zappiens-br", baseUrl: "https://www.zappiens.br", enabled: true },
  { id: "exatas-tv", baseUrl: "https://exatas.tv", enabled: true, topics: ["ciência", "engenharia", "educação"] },
  { id: "terra-preta", baseUrl: "https://tv.terrapreta.org.br", enabled: true },
  { id: "videoteca-ibict", baseUrl: "https://videoteca.ibict.br", enabled: true },
  { id: "blender", baseUrl: "https://video.blender.org", enabled: true, topics: ["blender", "3d", "animação"] },
  { id: "pcgaldo", baseUrl: "https://video.pcgaldo.com", enabled: true },
  { id: "lhc-br", baseUrl: "https://peertube.lhc.net.br", enabled: true },
];

const LICENSE_NAMES: Record<number, string> = {
  1: "Attribution", 2: "Attribution - Share Alike", 3: "Attribution - No Derivatives",
  4: "Attribution - Non Commercial", 5: "Attribution - Non Commercial - Share Alike",
  6: "Attribution - Non Commercial - No Derivatives", 7: "Public Domain Dedication",
  8: "Free of known copyright restrictions", 9: "All Rights Reserved",
};

type PeerTubeVideo = {
  id?: number; uuid?: string; shortUUID?: string; name?: string; description?: string;
  url?: string; thumbnailPath?: string; publishedAt?: string; createdAt?: string;
  account?: { displayName?: string; name?: string }; channel?: { displayName?: string; name?: string };
  tags?: string[]; language?: string; licence?: number; nsfw?: boolean; nsfwFlags?: number;
  files?: Array<{ fileUrl?: string }>; streamingPlaylists?: Array<{ playlistUrl?: string }>;
};
type PeerTubeResponse = { total?: number; data?: PeerTubeVideo[] };
type CacheEntry = { expiresAt: number; items: NormalizedContent[] };
const memoryCache = new Map<string, CacheEntry>();

function absoluteUrl(baseUrl: string, value?: string): string | undefined {
  if (!value) return undefined; try { return new URL(value, baseUrl).toString(); } catch { return undefined; }
}
function sleep(ms: number): Promise<void> { return new Promise((resolve) => setTimeout(resolve, ms)); }
function cacheKey(instance: PeerTubeInstance, options: PeerTubeFetchOptions): string {
  return JSON.stringify({ instance: instance.baseUrl, count: options.count ?? 20, start: options.start ?? 0, search: options.search ?? "", languageOneOf: options.languageOneOf ?? [], licenceOneOf: options.licenceOneOf ?? [], sort: options.sort ?? "-publishedAt", maxDurationSeconds: options.maxDurationSeconds ?? null });
}

export function normalizePeerTubeVideo(instance: PeerTubeInstance, video: PeerTubeVideo): NormalizedContent | null {
  if (video.nsfw === true) return null;
  const externalId = video.uuid ?? video.shortUUID ?? String(video.id ?? "");
  if (!externalId || !video.name) return null;
  const directFile = (video.files ?? []).find((file) => file.fileUrl)?.fileUrl;
  const playlist = (video.streamingPlaylists ?? []).find((item) => item.playlistUrl)?.playlistUrl;
  const licenceName = typeof video.licence === "number" ? (LICENSE_NAMES[video.licence] ?? "PeerTube license #" + video.licence) : undefined;
  const attribution = video.account?.displayName ?? video.account?.name ?? video.channel?.displayName ?? video.channel?.name;
  return {
    id: "peertube:" + instance.id + ":" + externalId, source: "peertube", externalId, mediaType: "video",
    title: video.name.trim(), description: video.description?.trim(),
    mediaUrl: absoluteUrl(instance.baseUrl, directFile ?? playlist ?? video.url), thumbnailUrl: absoluteUrl(instance.baseUrl, video.thumbnailPath),
    sourceUrl: absoluteUrl(instance.baseUrl, video.url) ?? instance.baseUrl, author: attribution ?? "PeerTube",
    publishedAt: video.publishedAt ?? video.createdAt, license: licenceName,
    rights: licenceName === "All Rights Reserved" ? "all-rights-reserved" : licenceName,
    rightsUrl: absoluteUrl(instance.baseUrl, "/api/v1/videos/licences"), attribution, tags: Array.isArray(video.tags) ? video.tags : [],
    metadata: { instance: instance.baseUrl, peerTubeId: video.id, uuid: video.uuid, shortUUID: video.shortUUID, language: video.language, licenceId: video.licence, nsfw: video.nsfw ?? false, nsfwFlags: video.nsfwFlags ?? 0 },
    cachedAt: new Date().toISOString(),
  };
}

export async function checkPeerTubeInstance(instance: PeerTubeInstance, timeoutMs = 8000): Promise<PeerTubeHealth> {
  const startedAt = Date.now(); const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(new URL("/nodeinfo/2.0.json", instance.baseUrl), { headers: { Accept: "application/json" }, signal: controller.signal });
    if (!response.ok) return { ok: false, baseUrl: instance.baseUrl, checkedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt, error: "HTTP " + response.status };
    const payload = await response.json() as { software?: { name?: string; version?: string } };
    if (payload.software?.name?.toLowerCase() !== "peertube") return { ok: false, baseUrl: instance.baseUrl, checkedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt, error: "NodeInfo não identifica PeerTube." };
    return { ok: true, baseUrl: instance.baseUrl, version: payload.software.version, checkedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt };
  } catch (error) {
    return { ok: false, baseUrl: instance.baseUrl, checkedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt, error: error instanceof Error && error.name === "AbortError" ? "timeout após " + timeoutMs + " ms" : "falha de rede ou NodeInfo indisponível" };
  } finally { clearTimeout(timeout); }
}

async function requestWithBackoff(url: URL, timeoutMs: number, maxRetries: number, retryBaseMs: number): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal });
      if (response.ok || ![408, 429, 500, 502, 503, 504].includes(response.status) || attempt === maxRetries) return response;
      const retryAfter = Number(response.headers.get("retry-after"));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : retryBaseMs * 2 ** attempt;
      await sleep(Math.min(delay, 8000));
    } catch (error) {
      lastError = error; if (attempt === maxRetries) break; await sleep(Math.min(retryBaseMs * 2 ** attempt, 8000));
    } finally { clearTimeout(timeout); }
  }
  throw lastError instanceof Error ? lastError : new Error("PeerTube request failed");
}

export async function fetchPeerTubeVideos(instance: PeerTubeInstance, options: PeerTubeFetchOptions = {}): Promise<NormalizedContent[]> {
  if (!instance.enabled) return [];
  const count = Math.min(Math.max(options.count ?? 20, 1), 100); const start = Math.max(options.start ?? 0, 0);
  const cacheTtlMs = options.cacheTtlMs ?? 30 * 60 * 1000; const key = cacheKey(instance, { ...options, count, start });
  const cached = memoryCache.get(key); if (cached && cached.expiresAt > Date.now()) return cached.items;
  const url = new URL("/api/v1/search/videos", instance.baseUrl);
  url.searchParams.set("count", String(count)); url.searchParams.set("start", String(start));
  url.searchParams.set("sort", options.sort ?? "-publishedAt"); url.searchParams.set("nsfw", "false");
  url.searchParams.set("hasWebVideoFiles", "true"); url.searchParams.set("skipCount", "true");
  if (options.search) url.searchParams.set("search", options.search);
  if (options.languageOneOf?.length) url.searchParams.set("languageOneOf", options.languageOneOf.join(","));
  if (options.licenceOneOf?.length) url.searchParams.set("licenceOneOf", options.licenceOneOf.join(","));
  if (options.maxDurationSeconds !== undefined) url.searchParams.set("durationMax", String(options.maxDurationSeconds));
  const response = await requestWithBackoff(url, options.timeoutMs ?? 10000, options.maxRetries ?? 2, options.retryBaseMs ?? 400);
  if (!response.ok) throw new Error("PeerTube " + instance.baseUrl + " respondeu HTTP " + response.status);
  const payload = await response.json() as PeerTubeResponse;
  const items = (payload.data ?? []).map((video) => normalizePeerTubeVideo(instance, video)).filter((item): item is NormalizedContent => item !== null);
  memoryCache.set(key, { items, expiresAt: Date.now() + cacheTtlMs }); return items;
}
export function clearPeerTubeCache(): void { memoryCache.clear(); }
