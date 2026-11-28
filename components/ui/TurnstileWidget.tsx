'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/**
 * Cloudflare Turnstile CAPTCHA. Shows nothing until NEXT_PUBLIC_TURNSTILE_SITE_KEY is set, so the
 * site keeps working before the keys exist. The token goes into a hidden field called
 * "captcha_token" (for plain forms) and to onToken (for client forms).
 */
export default function TurnstileWidget({ onToken }: { onToken?: (token: string) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const hidden = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!SITE_KEY || !box.current) return;
    const el = box.current;
    let widgetId: string | null = null;
    let cancelled = false;

    const render = () => {
      if (cancelled || !window.turnstile || widgetId) return;
      widgetId = window.turnstile.render(el, {
        sitekey: SITE_KEY,
        theme: 'auto',
        callback: (token: string) => {
          if (hidden.current) hidden.current.value = token;
          onToken?.(token);
        },
        'expired-callback': () => {
          if (hidden.current) hidden.current.value = '';
          onToken?.('');
        },
      });
    };

    if (window.turnstile) render();
    else {
      let script = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`);
      if (!script) {
        script = document.createElement('script');
        script.src = SRC;
        script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener('load', render);
    }
    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [onToken]);

  if (!SITE_KEY) return null;
  return (
    <div>
      <div ref={box} />
      <input ref={hidden} type="hidden" name="captcha_token" />
    </div>
  );
}
