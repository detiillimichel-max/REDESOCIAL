export const runtime = "nodejs";

const NARA_SEARCH_ENDPOINT = "https://catalog.archives.gov/api/v2/records/search";
const DEFAULT_TIMEOUT_MS = 10_000;
const ATTRIBUTION =
  "This product uses the National Archives Catalog API but is not endorsed or certified by the National Archives and Records Administration.";

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
  productionDates?: Array<{
    logicalDate?: string;
    year?: number;
    month?: number;
    day?: number;
  }>;
  digitalObjects?: NaraDigitalObject[];
  useRestriction?: { status?: string };
  accessRestriction?: { status?: string };
  generalRecordsTypes?: string[];
  creators?: Array<{ heading?: string }>;
};

type NaraHit = {
  _source?: { record?: NaraRecord };
};

type NaraResponse = {
  body?: {
    hits?: {
      hits?: NaraHit[];
    };
  };
};

type NormalizedNaraContent = {
  id: string;
  source: "nara";
  externalId: string;
  mediaType: "video";
  title: string;
  description?: string;
  mediaUrl: string;
  sourceUrl: string;
  author?: string;
  publishedAt?: string;
  rights?: string;
  rightsUrl: string;
  attribution: string;
  tags: string[];
  metadata: Record<string, unknown>;
  cachedAt: string;
};

function absoluteHttpUrl(value?: string): string | undefined {
  if (!value) return undefined;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

function isRestricted(record: NaraRecord): boolean {
  const statuses = [
    record.useRestriction?.status,
    record.accessRestriction?.status,
  ]
    .filter(Boolean)
    .map((value) => value!.toLowerCase());

  return statuses.some(
    (status) =>
      status.includes("restricted") && !status.includes("unrestricted"),
  );
}

function normalize(
  record: NaraRecord,
  object: NaraDigitalObject,
): NormalizedNaraContent | null {
  const naId = record.naId;
  const mediaUrl = absoluteHttpUrl(object.objectUrl);
  const title = record.title?.trim();

  if (!naId || !title || !mediaUrl || isRestricted(record)) {
    return null;
  }

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
    description:
      record.description?.trim() ?? record.scopeAndContentNote?.trim(),
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

async function searchNaraVideos(options: {
  q?: string;
  page?: number;
  rows?: number;
  apiKey: string;
}): Promise<NormalizedNaraContent[]> {
  const page = Number.isInteger(options.page)
    ? Math.max(options.page ?? 1, 1)
    : 1;
  const rows = Number.isInteger(options.rows)
    ? Math.min(Math.max(options.rows ?? 10, 1), 25)
    : 10;

  const url = new URL(NARA_SEARCH_ENDPOINT);
  url.searchParams.set("availableOnline", "true");
  url.searchParams.set("typeOfMaterials", "Moving Images");
  url.searchParams.set("q", options.q?.trim() || "video");
  url.searchParams.set("page", String(page));
  url.searchParams.set("rows", String(rows));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-api-key": options.apiKey,
      },
      cache: "no-store",
      signal: controller.signal,
    });

    const contentType = response.headers.get("content-type") ?? "";
    const responseUrl = response.url || url.toString();
    const rawBody = await response.text();
    const trimmedBody = rawBody.trim();

    if (!response.ok) {
      throw new Error(
        `NARA Catalog API respondeu HTTP ${response.status} ${response.statusText} (content-type: ${contentType || "unknown"}, url: ${responseUrl}).`,
      );
    }

    if (!contentType.toLowerCase().includes("json") || !/^[\[{]/.test(trimmedBody)) {
      const preview = trimmedBody
        .slice(0, 160)
        .replace(/\\s+/g, " ")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      throw new Error(
        `NARA retornou uma resposta não-JSON (HTTP ${response.status}, content-type: ${contentType || "unknown"}, url: ${responseUrl}, redirected: ${response.redirected}, preview: ${preview || "empty"}).`,
      );
    }

    let payload: NaraResponse;
    try {
      payload = JSON.parse(trimmedBody) as NaraResponse;
    } catch {
      throw new Error(
        `NARA retornou JSON inválido (HTTP ${response.status}, content-type: ${contentType || "unknown"}, url: ${responseUrl}).`,
      );
    }
    const hits = payload.body?.hits?.hits ?? [];

    return hits
      .flatMap((hit) => {
        const record = hit._source?.record;
        if (!record) return [];

        return (record.digitalObjects ?? [])
          .filter((object) => {
            const type = object.objectType?.toLowerCase() ?? "";
            return (
              type.includes("video") ||
              type.includes("moving image") ||
              type.includes("mpeg")
            );
          })
          .map((object) => normalize(record, object))
          .filter(
            (item): item is NormalizedNaraContent => item !== null,
          );
      });
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const apiKey = process.env.NARA_API_KEY?.trim();

    if (!apiKey) {
      return Response.json(
        {
          ok: false,
          source: "nara",
          error: "NARA_API_KEY is not configured on the server.",
        },
        {
          status: 500,
          headers: { "Cache-Control": "no-store, max-age=0" },
        },
      );
    }

    const rawPage = Number(url.searchParams.get("page") ?? "1");
    const rawRows = Number(url.searchParams.get("rows") ?? "10");

    const items = await searchNaraVideos({
      q: url.searchParams.get("q") ?? undefined,
      page: Number.isFinite(rawPage) ? rawPage : 1,
      rows: Number.isFinite(rawRows) ? rawRows : 10,
      apiKey,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        source: "nara",
        endpoint: "catalog-api-v2",
        items,
        attributionNotice: ATTRIBUTION,
      }),
      {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "NARA request failed.";

    return Response.json(
      { ok: false, source: "nara", error: message },
      {
        status: 502,
        headers: { "Cache-Control": "no-store, max-age=0" },
      },
    );
  }
}
