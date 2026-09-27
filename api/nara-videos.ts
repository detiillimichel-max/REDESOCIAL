import { searchNaraVideos } from "../src/content/nara";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);

  try {
    const items = await searchNaraVideos({
      q: url.searchParams.get("q") ?? undefined,
      page: Number(url.searchParams.get("page") ?? "1"),
      rows: Number(url.searchParams.get("rows") ?? "10"),
      apiKey: process.env.NARA_API_KEY,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        source: "nara",
        endpoint: "catalog-api-v2",
        items,
        attributionNotice:
          "This product uses the National Archives Catalog API but is not endorsed or certified by the National Archives and Records Administration.",
      }),
      {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "NARA request failed.";
    return Response.json(
      { ok: false, source: "nara", error: message },
      {
        status: 502,
        headers: { "Cache-Control": "no-store, max-age=0" },
      },
    );
  }
}
