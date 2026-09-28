export const runtime = "nodejs";

const NARA_ENDPOINT = "https://catalog.archives.gov/api/v2/records/search";

export async function GET(): Promise<Response> {
  const apiKey = process.env.NARA_API_KEY;

  if (!apiKey) {
    return Response.json(
      { ok: false, source: "nara", error: "NARA_API_KEY não configurada no servidor." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  const url = new URL(NARA_ENDPOINT);
  url.searchParams.set("q", "constitution");
  url.searchParams.set("page", "1");
  url.searchParams.set("rows", "1");

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "x-api-key": apiKey,
      },
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") ?? "";
    const body = await response.text();
    const preview = body.trim().slice(0, 240).replace(/\s+/g, " ");

    let json: unknown = null;
    try {
      json = body ? JSON.parse(body) : null;
    } catch {
      // Diagnostic endpoint: keep the raw response out of the result.
    }

    return Response.json(
      {
        ok: response.ok && json !== null,
        source: "nara",
        httpStatus: response.status,
        contentType,
        redirected: response.redirected,
        responseUrl: response.url || url.toString(),
        isJson: json !== null,
        preview,
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,
        source: "nara",
        error: error instanceof Error ? error.message : "Erro desconhecido ao chamar o NARA.",
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
