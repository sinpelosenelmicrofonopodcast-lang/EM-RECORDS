export type TrackEventPayload = {
  event: string;
  path?: string;
  locale?: string;
  metadata?: Record<string, unknown>;
};

function postEvent(payload: TrackEventPayload) {
  const body = JSON.stringify(payload);

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([body], { type: "application/json" });
    const sent = navigator.sendBeacon("/api/track", blob);
    if (sent) return;
  }

  void fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true
  }).catch(() => null);
}

export function trackEvent(event: string, metadata?: Record<string, unknown>) {
  if (typeof window === "undefined") return;

  postEvent({
    event,
    path: `${window.location.pathname}${window.location.search}`,
    locale: document.documentElement.lang || undefined,
    metadata
  });
}
