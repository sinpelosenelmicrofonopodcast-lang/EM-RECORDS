type TimelineEvent = {
  id: string;
  label: string;
  detail?: string;
  at: string;
};

export function ActivityTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return <p className="rounded-xl border border-white/10 bg-black/30 px-4 py-4 text-sm text-white/60">No activity captured yet.</p>;
  }

  return (
    <ol className="space-y-3">
      {events.map((event) => (
        <li key={event.id} className="flex gap-3">
          <div className="mt-1 h-2.5 w-2.5 rounded-full bg-gold" />
          <div className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.14em] text-gold">{new Date(event.at).toLocaleString()}</p>
            <p className="mt-1 text-sm font-medium text-white">{event.label}</p>
            {event.detail ? <p className="mt-1 text-sm text-white/65">{event.detail}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

