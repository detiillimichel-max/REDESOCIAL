import type { NormalizedContent } from "./types";

export interface CatalogStats {
  total: number;
  bySource: Record<string, number>;
  byMediaType: Record<string, number>;
}

export class ContentCatalog {
  private readonly items = new Map<string, NormalizedContent>();

  add(item: NormalizedContent): void {
    if (!item.id || !item.sourceUrl || !item.title) return;
    this.items.set(item.id, item);
  }

  addMany(items: NormalizedContent[]): void {
    for (const item of items) this.add(item);
  }

  getAll(): NormalizedContent[] {
    return [...this.items.values()];
  }

  getFresh(now = Date.now()): NormalizedContent[] {
    return this.getAll().filter((item) => {
      if (!item.expiresAt) return true;
      return new Date(item.expiresAt).getTime() > now;
    });
  }

  getBySource(source: NormalizedContent["source"]): NormalizedContent[] {
    return this.getAll().filter((item) => item.source === source);
  }

  stats(): CatalogStats {
    const bySource: Record<string, number> = {};
    const byMediaType: Record<string, number> = {};

    for (const item of this.items.values()) {
      bySource[item.source] = (bySource[item.source] ?? 0) + 1;
      byMediaType[item.mediaType] = (byMediaType[item.mediaType] ?? 0) + 1;
    }

    return {
      total: this.items.size,
      bySource,
      byMediaType,
    };
  }

  clear(): void {
    this.items.clear();
  }
}
