"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { shrink } from "@/lib/shrink";

type Big = { name: string; bytes: number; mimetype: string };
type Row = Big & { state: "waiting" | "working" | "done" | "kept" | "failed"; after?: number; note?: string };
const kb = (n: number) => `${Math.round(n / 1024)} KB`;

export function Shrinker() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    createClient().rpc("cr_big_pictures").then(({ data, error }) => {
      if (error) { setProblem(error.message); setRows([]); return; }
      setRows(((data ?? []) as Big[]).map((b) => ({ ...b, state: "waiting" })));
    });
  }, []);

  function patch(name: string, p: Partial<Row>) { setRows((r) => (r ?? []).map((x) => (x.name === name ? { ...x, ...p } : x))); }

  async function run() {
    if (!rows || busy) return;
    setBusy(true);
    const supabase = createClient();
    for (const r of rows) {
      if (r.state !== "waiting") continue;
      patch(r.name, { state: "working" });
      try {
        const { data: blob, error } = await supabase.storage.from("proofs").download(r.name);
        if (error || !blob) throw new Error(error?.message ?? "no file");
        const small = await shrink(new File([blob], r.name.split("/").pop() ?? "picture", { type: r.mimetype }));
        if (small.size >= blob.size) { patch(r.name, { state: "kept", note: "already as small as it gets" }); continue; }
        const { error: up } = await supabase.storage.from("proofs").upload(r.name, small, { contentType: small.type, cacheControl: "3600", upsert: true });
        if (up) throw new Error(up.message);
        patch(r.name, { state: "done", after: small.size });
      } catch (e) {
        patch(r.name, { state: "failed", note: e instanceof Error ? e.message : "failed" });
      }
    }
    setBusy(false);
  }

  if (rows === null) return <div className="px" style={{ fontSize: 11, color: "var(--muted)" }}>LOOKING…</div>;
  const waiting = rows.filter((r) => r.state === "waiting").length;
  return (
    <>
      {problem ? <div className="px" style={{ fontSize: 10, color: "var(--mag)" }}>{problem.toUpperCase()}</div> : null}
      {rows.length === 0 ? <div className="empty">NOTHING OVER 400 KB</div> : null}
      {rows.map((r) => (
        <div key={r.name} className="card" style={{ gap: 4 }}>
          <div className="px" style={{ fontSize: 10, color: "var(--text-3)", overflowWrap: "anywhere" }}>{r.name.split("/").pop()?.toUpperCase()}</div>
          <div className="px" style={{ fontSize: 10, color: r.state === "failed" ? "var(--mag)" : r.state === "done" ? "var(--blu-soft)" : "var(--muted)" }}>
            {kb(r.bytes)}
            {r.state === "done" ? ` → ${kb(r.after ?? 0)}` : ""}
            {" · "}
            {r.state === "working" ? "SHRINKING…" : r.state.toUpperCase()}
            {r.note ? ` · ${r.note.toUpperCase()}` : ""}
          </div>
        </div>
      ))}
      {rows.length ? (
        <button type="button" className="btn btn-lg btn-purple btn-block" onClick={() => void run()} disabled={busy || waiting === 0}>
          {busy ? "WORKING…" : waiting ? `SHRINK ${waiting} PICTURE${waiting === 1 ? "" : "S"}` : "ALL DONE"}
        </button>
      ) : null}
    </>
  );
}
