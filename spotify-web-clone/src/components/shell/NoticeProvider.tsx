"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface NoticeApi {
  /** Show a short toast. Used wherever the real product would need an account or an unbuilt page. */
  notify: (message: string) => void;
  /** Convenience for "<feature> isn't implemented in this demo." */
  notImplemented: (feature: string) => void;
}

const NoticeContext = createContext<NoticeApi | null>(null);

export function NoticeProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const notify = useCallback((text: string) => {
    window.clearTimeout(timer.current);
    setMessage(text);
    timer.current = window.setTimeout(() => setMessage(null), 4000);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const value = useMemo<NoticeApi>(
    () => ({
      notify,
      notImplemented: (feature) => notify(`${feature} isn't implemented in this demo.`),
    }),
    [notify],
  );

  return (
    <NoticeContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-28 z-[70] flex justify-center px-4"
      >
        {message && (
          <p className="pointer-events-auto max-w-md rounded-full bg-white px-5 py-3 text-center text-sm font-bold text-black shadow-lg">
            {message}
          </p>
        )}
      </div>
    </NoticeContext.Provider>
  );
}

export function useNotice(): NoticeApi {
  const ctx = useContext(NoticeContext);
  if (!ctx) throw new Error("useNotice must be used inside <NoticeProvider>");
  return ctx;
}
