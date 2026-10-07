import type { ReactNode } from "react";

const URL_RE = /(https?:\/\/[^\s]+)/g;

export function MessageBody({ text }: { text: string }) {
  const parts = text.split(URL_RE);

  return (
    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/80">
      {parts.map((part, index): ReactNode => {
        if (/^https?:\/\//.test(part)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-gold underline decoration-gold/40 underline-offset-4 hover:decoration-gold"
            >
              {part}
            </a>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </p>
  );
}
