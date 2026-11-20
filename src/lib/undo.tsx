"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useData } from "./data";
import { useI18n, Key } from "./i18n";

type Pending = { id: number; label: Key; undo: () => Promise<unknown> };
const Ctx = createContext<{ offerUndo: (label: Key, undo: () => Promise<unknown>) => void }>({ offerUndo: () => {} });

/** After every change, show a bar with an Undo button for a few seconds. */
export function UndoProvider({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const { refresh } = useData();
  const [p, setP] = useState<Pending | null>(null);
  const [state, setState] = useState<"idle" | "busy" | "done" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = (ms: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { setP(null); setState("idle"); }, ms);
  };
  const offerUndo = useCallback((label: Key, undo: () => Promise<unknown>) => {
    setP({ id: Date.now(), label, undo }); setState("idle"); close(15000);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const run = async () => {
    if (!p || state === "busy") return;
    setState("busy");
    try { await p.undo(); await refresh(); setState("done"); }
    catch { setState("failed"); }
    close(3000);
  };

  return (
    <Ctx.Provider value={{ offerUndo }}>
      {children}
      {p && (
        <div className="fixed inset-x-0 bottom-20 z-40 flex justify-center px-4">
          <div className="flex w-full max-w-md items-center gap-3 rounded-2xl bg-stone-900 px-4 py-3 text-white shadow-xl">
            <span className="flex-1">
              {state === "done" ? `↩️ ${t("undone")}` : state === "failed" ? t("undoFailed") : `✓ ${t(p.label)}`}
            </span>
            {state === "idle" || state === "busy" ? (
              <button onClick={run} disabled={state === "busy"} className="rounded-xl bg-white px-4 py-2 font-bold text-stone-900">
                {state === "busy" ? "…" : t("undo")}
              </button>
            ) : null}
            <button onClick={() => { setP(null); setState("idle"); }} aria-label="close" className="px-1 text-stone-400">✕</button>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

export const useUndo = () => useContext(Ctx).offerUndo;

/** Throw if a Supabase call failed, so undo can report it. */
export function check<T extends { error: unknown }>(r: T): T {
  if (r.error) throw r.error;
  return r;
}
