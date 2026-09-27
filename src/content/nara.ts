import type { NormalizedContent } from "./types";

const NARA_SEARCH_ENDPOINT = "https://catalog.archives.gov/api/v2/records/search";
const DEFAULT_TIMEOUT_MS = 10_000;
const ATTRIBUTION =
  "This product uses the National Archives Catalog API but is not endorsed or certified by the National Archives and Records Administration.";

export interface NaraQuery {
  q?: string;
  page?: number;
  rows?: number;
  timeoutMs?: number;
  apiKey?: string;
}

type NaraDigitalObject = {
  objectId?: string | number;
  objectFilename?: string;
  objectUrl?: string;
  objectFileSize?: number;
  objectType?: string;
};

type NaraRecord = {
  naId?: number;
  title?: string;
  description?: string;
  scopeAndContentNote?: string;
  productionDates?: Array<{ logicalDate?: string; year?: number; month?: number; day?: number }>;
  digitalObjects?: NaraDigitalObject[];
  useRestriction?: { status?: string };
  accessRestriction?: { status?: string };
  generalRecordsTypes?: string[];
  creators?: Array<{ heading?: string }>;
};

type NaraHit = {
  _id?: string;
  _source?: { record?: NaraRecord };
};

type NaraResponse = {
  body?: {
    hits?: {
      total?: { value?: number };
      hits?: NaraHit[];
    };
  };
};

function absoluteHttpUrl(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function isRestricted(record: NaraRecord): boolean {
  const statuses = [record.useRestriction?.status, record.accessRestriction?.status]
    .filter(Boolean)
    .map((value) => value!.toLowerCase());

  return statuses.some((status) => status.includes("restricted") && !status.includes("unrestricted"));
}

function normalize(record: NaraRecord, object: NaraDigitalObject): NormalizedContent | null {
  const naId = record.naId;
  const mediaUrl = absoluteHttpUrl(object.objectUrl);
  const title = record.title?.trim();

  if (!naId || !title || !mediaUrl || isRestricted(record)) return null;

  const sourceUrl = `https://catalog.archives.gov/id/${naId}`;
  const publishedAt =
    record.productionDates?.find((date) => date.logicalDate)?.logicalDate ??
    record.productionDates?.find((date) => date.year)?.year?.toString();

  return {
    id: `nara:${naId}:${object.objectId ?? object.objectFilename ?? mediaUrl}`,
    source: "nara",
    externalId: String(object.objectId ?? naId),
    mediaType: "video",
    title,
    description: record.description?.trim() ?? record.scopeAndContentNote?.trim(),
    mediaUrl,
    sourceUrl,
    author: record.creators?.find((creator) => creator.heading)?.heading,
    publishedAt,
    rights:
      record.useRestriction?.status ??
      record.accessRestriction?.status ??
      "NARA access status not specified",
    rightsUrl: sourceUrl,
    attribution: "National Archives and Records Administration (NARA)",
    tags: ["NARA", "National Archives", "História", "Vídeo"],
    metadata: {
      naId,
      objectId: object.objectId,
      objectFilename: object.objectFilename,
      objectType: object.objectType,
      objectFileSize: object.objectFileSize,
      generalRecordsTypes: record.generalRecordsTypes ?? [],
      naraAttributionNotice: ATTRIBUTION,
      api: "https://catalog.archives.gov/api/v2",
    },
    cachedAt: new Date().toISOString(),
  };
}

/**
 * NARA adapter.
 *
 * IMPORTANT: NARA's current API terms say not to cache or store content
 * returned by the Catalog API. This adapter deliberately has no persistent
 * or in-memory response cache.
 *
 * The API key is supplied by the server route so this module remains
 * environment-agnostic and does not reference Node globals.
 */
export async function searchNaraVideos(query: NaraQuery = {}): Promise<NormalizedContent[]> {
  const page = Number.isInteger(query.page) ? Math.max(query.page ?? 1, 1) : 1;
  const rows = Number.isInteger(query.rows)
    ? Math.min(Math.max(query.rows ?? 10, 1), 25)
    : 10;

  const url = new URL(NARA_SEARCH_ENDPOINT);
  url.searchParams.set("availableOnline", "true");
  url.searchParams.set("typeOfMaterials", "Moving Images");
  url.searchParams.set("q", query.q?.trim() || "video");
  url.searchParams.set("page", String(page));
  url.searchParams.set("rows", String(rows));

  const apiKey = query.apiKey?.trim();
  if (!apiKey) {
    throw new Error("NARA_API_KEY is not configured on the server.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    query.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "x-api-key": apiKey,
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`NARA Catalog API respondeu HTTP ${response.status}.`);
    }

    const payload = (await response.json()) as NaraResponse;
    const hits = payload.body?.hits?.hits ?? [];

    return hits
      .flatMap((hit) => {
        const record = hit._source?.record;
        if (!record) return [];

        return (record.digitalObjects ?? [])
          .filter((object) => {
            const type = object.objectType?.toLowerCase() ?? "";
            return type.includes("video") || type.includes("moving image") || type.includes("mpeg");
          })
          .map((object) => normalize(record, object))
          .filter((item): item is NormalizedContent => item !== null);
      });
  } finally {
    clearTimeout(timeout);
  }
}
