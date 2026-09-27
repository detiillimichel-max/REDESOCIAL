export const CONTENT_SOURCES = [
  { id: "pinterest", name: "Pinterest", enabled: true, feedWeight: 0.4, requiresSecret: true },
  { id: "nasa", name: "NASA", enabled: true, feedWeight: null, requiresSecret: true },
  { id: "nara", name: "NARA", enabled: true, feedWeight: null, requiresSecret: false },
  { id: "europeana", name: "Europeana", enabled: true, feedWeight: null, requiresSecret: true },
  { id: "dpla", name: "DPLA", enabled: true, feedWeight: null, requiresSecret: true },
  { id: "wikimedia", name: "Wikimedia", enabled: true, feedWeight: null, requiresSecret: false },
  { id: "internet-archive", name: "Internet Archive", enabled: true, feedWeight: null, requiresSecret: false },
  { id: "guardian", name: "The Guardian", enabled: true, feedWeight: null, requiresSecret: true },
  { id: "peertube", name: "PeerTube", enabled: true, feedWeight: null, requiresSecret: false },
] as const;
