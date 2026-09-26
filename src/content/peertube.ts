import type { NormalizedContent } from "./types";

export interface PeerTubeInstance {
  id: string;
  baseUrl: string;
  enabled: boolean;
}

export const PEERTUBE_INSTANCES: PeerTubeInstance[] = [
  { id: "peertube-1", baseUrl: "https://video.niboe.info", enabled: true },
  { id: "peertube-2", baseUrl: "https://www.zappiens.br", enabled: true },
  { id: "peertube-3", baseUrl: "https://exatas.tv", enabled: true },
  { id: "peertube-4", baseUrl: "https://tv.terrapreta.org.br", enabled: true },
];

type PeerTubeVideo = {
  id?: number;
  uuid?: string;
  shortUUID?: string;
  name?: string;
  description?: string;
  url?: string;
  thumbnailPath?: string;
  publishedAt?: string;
  createdAt?: string;
  account?: { displayName?: string; name?: string };
  channel?: { displayName?: string; name?: string };
  tags?: string[];
  files?: Array<{ fileUrl?: string; resolution?: { id?: number } }>;
  streamingPlaylists?: Array<{ playlistUrl?: string; resolution?: { id?: number } }>;
};

function absoluteUrl(baseUrl: string, value?: string): string | undefined {
  if (!value) return undefined;
  return new URL(value, baseUrl).toString();
}

export function normalizePeerTubeVideo(
  instance: PeerTubeInstance,
  video: PeerTubeVideo,
): NormalizedContent {
  const externalId = video.uuid ?? video.shortUUID ?? String(video.id ?? "unknown");
  const files = video.files ?? [];
  const playlists = video.streamingPlaylists ?? [];
  const directFile = files.find((file) => file.fileUrl)?.fileUrl;
  const playlist = playlists.find((item) => item.playlistUrl)?.playlistUrl;

  return {
    id: `peertube:${instance.id}:${externalId}`,
    source: "peertube",
    externalId,
    mediaType: "video",
    title: video.name?.trim() || "Vídeo PeerTube",
    description: video.description?.trim(),
    mediaUrl: absoluteUrl(instance.baseUrl, directFile ?? playlist ?? video.url),
    thumbnailUrl: absoluteUrl(instance.baseUrl, video.thumbnailPath),
    sourceUrl: absoluteUrl(instance.baseUrl, video.url) ?? instance.baseUrl,
    author:
      video.account?.displayName ??
      video.account?.name ??
      video.channel?.displayName ??
      video.channel?.name ??
      "PeerTube",
    publishedAt: video.publishedAt ?? video.createdAt,
    tags: Array.isArray(video.tags) ? video.tags : [],
    metadata: {
      instance: instance.baseUrl,
      peerTubeId: video.id,
      uuid: video.uuid,
      shortUUID: video.shortUUID,
    },
    cachedAt: new Date().toISOString(),
  };
}

/**
 * Fetch public videos from one PeerTube instance.
 * No authentication token is required for public video listing.
 */
export async function fetchPeerTubeVideos(
  instance: PeerTubeInstance,
  count = 20,
): Promise<NormalizedContent[]> {
  if (!instance.enabled) return [];

  const url = new URL("/api/v1/videos", instance.baseUrl);
  url.searchParams.set("count", String(Math.min(Math.max(count, 1), 100)));
  url.searchParams.set("sort", "-publishedAt");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`PeerTube ${instance.baseUrl} respondeu HTTP ${response.status}`);
  }

  const payload = (await response.json()) as { data?: PeerTubeVideo[] };
  return (payload.data ?? []).map((video) =>
    normalizePeerTubeVideo(instance, video),
  );
}
