import { fetchNasaApod } from "../src/content/nasa";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? undefined;
  const startDate = url.searchParams.get("start_date") ?? undefined;
  const endDate = url.searchParams.get("end_date") ?? undefined;
  const rawCount = url.searchParams.get("count");
  const count = rawCount ? Number(rawCount) : undefined;

  // The NASA key stays server-side. Never expose it to the browser.
  const apiKey = process.env.NASA_API_KEY;

  try {
    const items = await fetchNasaApod({
      date,
      startDate,
      endDate,
      count,
      apiKey: apiKey || undefined,
    });

    return Response.json({
      ok: true,
      source: "nasa",
      endpoint: "current-apod-api",
      items,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "NASA APOD request failed.";
    return Response.json(
      {
        ok: false,
        source: "nasa",
        error: message,
      },
      { status: 502 },
    );
  }
}
