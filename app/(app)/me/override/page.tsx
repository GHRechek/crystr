import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireMe, getOverrideKey, getOverrideUses } from "@/lib/data";
import { QrCode } from "@/components/qr";
import { overrideUrl } from "@/lib/breach";
import { ago } from "@/lib/crystr";

/** A witch's key against the registry, as a QR code to hold up, and who has come in
 *  through the override. The key is theirs for good. Only witches get here. */
export default async function OverridePage() {
  const { userId, profile } = await requireMe();
  if (!profile.is_witch) redirect("/me");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const [key, uses] = await Promise.all([getOverrideKey(), getOverrideUses()]);
  const url = key && host ? overrideUrl(`${proto}://${host}`, key.code) : null;

  return (
    <div className="pad" style={{ gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/me" className="btn btn-sm">
          ← ME
        </Link>
      </div>

      <div>
        <h1 className="screen-title">THE OVERRIDE</h1>
        <div className="screen-intro">
          Some of the City&apos;s people cannot fill in the registry: the form has no line for what they are. Show them
          this. Scanning it breaks them into the records with no form at all. It is your key and it does not change:
          anyone who scans it gets in, so hold it up, never post it.
        </div>
      </div>

      {url ? (
        <div className="tile" style={{ padding: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div style={{ padding: 6, background: "#fff" }}>
            <QrCode text={url} size={232} label="Your override key, as a QR code" />
          </div>
          <div className="px" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: ".04em", textAlign: "center", overflowWrap: "anywhere" }}>
            {url}
          </div>
          <div className="px" style={{ fontSize: 11, color: "var(--pur-pale)" }}>
            KEY MADE {ago(key!.created_at).toUpperCase()}
          </div>
        </div>
      ) : (
        <div className="banner-note banner-mag">The City would not hand over a key just now. Try again in a moment.</div>
      )}

      <div className="tile" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <div className="px" style={{ fontSize: 11, color: "var(--pur-pale)" }}>
            CAME IN THROUGH THE OVERRIDE
          </div>
          <span className="spacer" />
          <div className="px" style={{ fontSize: 11, color: "var(--muted)" }}>
            {uses.length} · ONLY WITCHES SEE THIS
          </div>
        </div>
        {uses.length ? (
          uses.map((u) => (
            <div key={u.user_id} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
              <Link href={u.who ? `/u/${u.who.handle}` : "#"} style={{ fontSize: 13, color: "var(--text)" }}>
                {u.who?.handle ?? "someone"}
              </Link>
              <span className="spacer" />
              <div className="px" style={{ fontSize: 10, color: "var(--muted)", whiteSpace: "nowrap" }}>
                {u.witch_id === userId ? "YOUR KEY" : `${(u.witch?.handle ?? "a witch").toUpperCase()}'S KEY`} · {ago(u.at).toUpperCase()}
              </div>
            </div>
          ))
        ) : (
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Nobody yet.</div>
        )}
      </div>
    </div>
  );
}
