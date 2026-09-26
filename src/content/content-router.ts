import type { NormalizedContent } from "./types";

const PINTEREST_RATIO = 0.4;

export function routeFeed(
  items: NormalizedContent[],
  requestedCount: number,
): NormalizedContent[] {
  const unique = Array.from(new Map(items.map((item) => [item.id, item])).values());
  const pinterest = unique.filter((item) => item.source === "pinterest");
  const publicSources = unique.filter((item) => item.source !== "pinterest");

  const pinterestTarget = Math.round(requestedCount * PINTEREST_RATIO);
  const selectedPinterest = pinterest.slice(0, pinterestTarget);

  const remaining = requestedCount - selectedPinterest.length;
  const selectedPublic = publicSources.slice(0, remaining);

  return [...selectedPinterest, ...selectedPublic].slice(0, requestedCount);
}
