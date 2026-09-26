import type { NormalizedContent } from "./types";

export interface EnrichmentResult {
  category?: string;
  summary?: string;
  tags?: string[];
  description?: string;
}

export async function enrichWithQwen(
  _content: NormalizedContent,
): Promise<EnrichmentResult> {
  // Intentionally disabled in the bootstrap. The Qwen key must stay server-side.
  return {};
}
