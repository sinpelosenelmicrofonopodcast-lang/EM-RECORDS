"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: { sitekey: string; callback: (token: string) => void; theme?: string }) => unknown;
    };
  }
}

type TurnstileFieldProps = {
  inputName: string;
};

export function TurnstileField({ inputName }: TurnstileFieldProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [token, setToken] = useState("");

  useEffect(() => {
    if (!siteKey || !containerRef.current) {
      return;
    }

    const existingScript = document.querySelector('script[data-turnstile="true"]');

    const renderWidget = () => {
      if (!window.turnstile || !containerRef.current) {
        return;
      }
      window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (nextToken: string) => setToken(nextToken),
        theme: "dark"
      });
    };

    if (existingScript) {
      renderWidget();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.defer = true;
    script.dataset.turnstile = "true";
    script.onload = renderWidget;
    document.head.appendChild(script);
  }, [siteKey]);

  if (!siteKey) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div ref={containerRef} />
      <input type="hidden" name={inputName} value={token} />
    </div>
  );
}
