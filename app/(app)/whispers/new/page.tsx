import Link from "next/link";
import { requireMe, getPeople } from "@/lib/data";
import { Avatar } from "@/components/bits";
import { openThread } from "@/lib/actions";

export default async function NewWhisperPage() {
  const { userId } = await requireMe();
  const people = await getPeople(userId);

  return (
    <div className="pad" style={{ gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <Link href="/whispers" className="btn btn-sm">
          ← WHISPERS
        </Link>
        <div className="spacer" />
        <div className="px" style={{ fontSize: 9, color: "var(--muted)" }}>
          OPENING ONE IS FREE
        </div>
      </div>

      {people.map((p) => (
        <form key={p.id} action={openThread}>
          <input type="hidden" name="other_id" value={p.id} />
          <button type="submit" className="rowcard">
            <Avatar person={p} />
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{p.handle}</div>
              {p.display_name ? (
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{p.display_name}</div>
              ) : null}
            </div>
            <span className="px" style={{ fontSize: 8.5, color: "var(--dim)" }}>
              →
            </span>
          </button>
        </form>
      ))}

      {people.length === 0 ? (
        <div className="empty">
          THERE IS NOBODY ELSE IN THE CITY YET
          <br />
          <span style={{ color: "var(--muted)" }}>BRING SOMEONE. IT IS QUIET.</span>
        </div>
      ) : null}
    </div>
  );
}
