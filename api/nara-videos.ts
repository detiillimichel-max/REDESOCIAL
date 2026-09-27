import { searchNaraVideos } from "../src/content/nara";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const apiKey = process.env.NARA_API_KEY?.trim();

    if (!apiKey) {
      return Response.json(
        { ok: false, source: "nara", error: "NARA_API_KEY is not configured on the server." },
        { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } },
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

    return new Response(JSON.stringify({
      ok: true,
      source: "nara",
      endpoint: "catalog-api-v2",
      items,
      attributionNotice: "This product uses the National Archives Catalog API but is not endorsed or certified by the National Archives and Records Administration.",
    }), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "NARA request failed.";
    return Response.json(
      { ok: false, source: "nara", error: message },
      { status: 502, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
