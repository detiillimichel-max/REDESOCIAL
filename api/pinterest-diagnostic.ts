/**
 * Temporary Pinterest API diagnostic.
 *
 * Security:
 * - The Pinterest access token is read only from the Vercel environment.
 * - No token, Pin URLs, image URLs, titles, or user data are returned.
 * - The first request is limited to one page; a second page is fetched only
 *   when Pinterest explicitly returns a bookmark.
 *
 * Remove this route after the diagnostic is complete.
 */

export const runtime = "nodejs";

type PinterestPin = {
  id?: string;
  title?: string | null;
  description?: string | null;
  link?: string | null;
  created_at?: string | null;
  media?: {
    media_type?: string | null;
    images?: Record<string, unknown>;
    video?: unknown;
  } | null;
};

type PinterestResponse = {
  items?: PinterestPin[];
  bookmark?: string | null;
};

function summarizeItems(items: PinterestPin[]) {
  return {
    total: items.length,
    withId: items.filter((item) => Boolean(item.id)).length,
    withTitle: items.filter((item) => Boolean(item.title)).length,
    withDescription: items.filter((item) => Boolean(item.description)).length,
    withLink: items.filter((item) => Boolean(item.link)).length,
    withCreatedAt: items.filter((item) => Boolean(item.created_at)).length,
    withMedia: items.filter((item) => Boolean(item.media)).length,
    mediaTypes: items.reduce<Record<string, number>>((counts, item) => {
      const type = item.media?.media_type ?? "unknown";
      counts[type] = (counts[type] ?? 0) + 1;
      return counts;
    }, {}),
  };
}

export async function GET(request: Request): Promise<Response> {
  void request;

  const token = process.env.PINTEREST_ACCESS_TOKEN;

  if (!token) {
    return Response.json(
      { ok: false, error: "PINTEREST_ACCESS_TOKEN is not configured on Vercel." },
      { status: 500 },
    );
  }

  const startedAt = Date.now();
  const pageSize = 250;
  const maxPages = 2;
  let bookmark: string | undefined;
  let pagesFetched = 0;
  let totalItems = 0;
  let lastRateLimit: Record<string, string | null> = {};
  const pageSummaries: Array<ReturnType<typeof summarizeItems>> = [];

  try {
    while (pagesFetched < maxPages) {
      const url = new URL("https://api.pinterest.com/v5/pins");
      url.searchParams.set("page_size", String(pageSize));
      if (bookmark) url.searchParams.set("bookmark", bookmark);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      let response: Response;
      try {
        response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      lastRateLimit = {
        limit: response.headers.get("x-ratelimit-limit"),
        remaining: response.headers.get("x-ratelimit-remaining"),
        reset: response.headers.get("x-ratelimit-reset"),
      };

      if (!response.ok) {
        const errorBody = await response.text();
        return Response.json(
          {
            ok: false,
            status: response.status,
            error:
              response.status === 403
                ? "Pinterest returned 403. Check app access/approval and token scope."
                : "Pinterest API request failed.",
            rateLimit: lastRateLimit,
            durationMs: Date.now() - startedAt,
            detailsLength: errorBody.length,
          },
          { status: 502 },
        );
      }

      const data = (await response.json()) as PinterestResponse;
      const items = Array.isArray(data.items) ? data.items : [];

      pagesFetched += 1;
      totalItems += items.length;
      pageSummaries.push(summarizeItems(items));

      bookmark = data.bookmark || undefined;
      if (!bookmark) break;
    }

    return Response.json({
      ok: true,
      diagnostic: "pinterest-api",
      pageSize,
      maxPages,
      pagesFetched,
      totalItemsObserved: totalItems,
      hasMore: Boolean(bookmark),
      pageSummaries,
      rateLimit: lastRateLimit,
      durationMs: Date.now() - startedAt,
      note: "Temporary diagnostic. No Pinterest content or token is returned.",
    });
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";

    return Response.json(
      {
        ok: false,
        error: aborted
          ? "Pinterest API request timed out after 15 seconds."
          : "Unexpected server error while calling Pinterest.",
        durationMs: Date.now() - startedAt,
      },
      { status: 502 },
    );
  }
}
