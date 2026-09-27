export type ContentSource =
  | "pinterest" | "nasa" | "nara" | "europeana" | "dpla" | "wikimedia"
  | "internet-archive" | "guardian" | "peertube" | "future";

export interface NormalizedContent {
  id: string; source: ContentSource; externalId: string;
  mediaType: "video" | "image" | "article"; title: string;
  description?: string; mediaUrl?: string; thumbnailUrl?: string;
  sourceUrl: string; author?: string; publishedAt?: string; license?: string;
  rights?: string; rightsUrl?: string; attribution?: string; tags: string[];
  metadata: Record<string, unknown>; cachedAt: string; expiresAt?: string;
}
