"use client";

import { useMemo, useState, useTransition } from "react";
import type { ContentQueueRecord } from "@/modules/growth-engine/types";

type Props = {
  initialQueue: ContentQueueRecord[];
  canApprove: boolean;
};

function toLocalDateTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function badgeClass(status: string) {
  if (status === "posted") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  if (status === "scheduled") return "border-sky-400/30 bg-sky-400/10 text-sky-100";
  if (status === "ready_for_manual") return "border-amber-400/30 bg-amber-400/10 text-amber-100";
  if (status === "failed") return "border-red-400/30 bg-red-400/10 text-red-200";
  return "border-white/10 bg-white/5 text-white/70";
}

export function SocialQueueManager({ initialQueue, canApprove }: Props) {
  const [queue, setQueue] = useState(initialQueue);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const sortedQueue = useMemo(
    () =>
      [...queue].sort((a, b) => {
        const aTime = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
        const bTime = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
        if (aTime !== bTime) return aTime - bTime;
        return a.queuePosition - b.queuePosition;
      }),
    [queue]
  );

  function reorderItems(activeId: string, targetId: string) {
    const current = [...sortedQueue];
    const fromIndex = current.findIndex((item) => item.id === activeId);
    const toIndex = current.findIndex((item) => item.id === targetId);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return current;
    const [moved] = current.splice(fromIndex, 1);
    current.splice(toIndex, 0, moved);
    return current.map((item, index) => ({ ...item, queuePosition: index + 1 }));
  }

  function commitReorder(ids: string[]) {
    startTransition(async () => {
      const response = await fetch("/api/admin/social-engine/queue", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "reorder", ids })
      });
      setMessage(response.ok ? "Queue updated." : "Queue reorder failed.");
    });
  }

  function commitItem(item: ContentQueueRecord) {
    startTransition(async () => {
      const response = await fetch("/api/admin/social-engine/queue", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "update",
          id: item.id,
          patch: {
            title: item.title,
            caption: item.caption,
            scheduledAt: item.scheduledAt,
            approvalState: item.approvalState
          }
        })
      });

      setMessage(response.ok ? "Item saved." : "Item save failed.");
    });
  }

  return (
    <div className="space-y-3">
      {message ? <p className="text-xs uppercase tracking-[0.16em] text-white/50">{message}</p> : null}
      {sortedQueue.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/30 p-5 text-sm text-white/60">No queued posts yet.</div>
      ) : null}

      {sortedQueue.map((item) => (
        <article
          key={item.id}
          draggable
          onDragStart={() => setDraggingId(item.id)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => {
            if (!draggingId || draggingId === item.id) return;
            const nextQueue = reorderItems(draggingId, item.id);
            setQueue(nextQueue);
            setDraggingId(null);
            commitReorder(nextQueue.map((entry) => entry.id));
          }}
          className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-gold">{item.artistName ?? "EM Records"}</p>
              <p className="mt-1 text-sm text-white/50">{item.contentType.replace(/_/g, " ")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em] ${badgeClass(item.status)}`}>
                {item.status.replace(/_/g, " ")}
              </span>
              <span className="inline-flex rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-white/60">
                Pos {item.queuePosition}
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_1fr]">
            <div className="space-y-3">
              <input
                value={item.title ?? ""}
                onChange={(event) =>
                  setQueue((current) => current.map((entry) => (entry.id === item.id ? { ...entry, title: event.target.value } : entry)))
                }
                className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
              />
              <textarea
                rows={4}
                value={item.caption}
                onChange={(event) =>
                  setQueue((current) => current.map((entry) => (entry.id === item.id ? { ...entry, caption: event.target.value } : entry)))
                }
                className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
              />
            </div>

            <div className="space-y-3">
              <input
                type="datetime-local"
                value={toLocalDateTime(item.scheduledAt)}
                onChange={(event) =>
                  setQueue((current) =>
                    current.map((entry) =>
                      entry.id === item.id
                        ? {
                            ...entry,
                            scheduledAt: event.target.value ? new Date(event.target.value).toISOString() : null
                          }
                        : entry
                    )
                  )
                }
                className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
              />
              {canApprove ? (
                <select
                  value={item.approvalState}
                  onChange={(event) =>
                    setQueue((current) =>
                      current.map((entry) =>
                        entry.id === item.id ? { ...entry, approvalState: event.target.value as ContentQueueRecord["approvalState"] } : entry
                      )
                    )
                  }
                  className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
                >
                  <option value="pending">Pending approval</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              ) : (
                <div className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/60">Approval: {item.approvalState}</div>
              )}
              <button
                type="button"
                onClick={() => commitItem(item)}
                disabled={pending}
                className="rounded-full border border-gold px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold disabled:opacity-60"
              >
                Save item
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
