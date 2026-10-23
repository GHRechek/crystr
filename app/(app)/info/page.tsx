import Link from "next/link";
import { GAME_INFO as G, TICKETS_URL } from "@/lib/info";

/** What the game is, when and where, and how to behave in it. The wording is the event
 *  page's own; tickets are sold there, not here. */
export default function GameInfoPage() {
  const body = { fontSize: 13, lineHeight: 1.6, color: "var(--text-2)", textWrap: "pretty" } as const;

  return (
    <div className="pad" style={{ gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/" className="btn btn-sm">
          ← BACK
        </Link>
      </div>

      <div>
        <h1 className="screen-title">GAME INFO</h1>
        <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: "-.01em", lineHeight: 1.25, marginTop: 4 }}>
          {G.title}
        </div>
      </div>

      {G.intro.map((p, i) => (
        <div key={i} style={body}>
          {p}
        </div>
      ))}

      <div className="card" style={{ gap: 10 }}>
        {G.details.map(([k, v]) => (
          <div key={k}>
            <div className="px" style={{ fontSize: 11, color: "var(--mag)", marginBottom: 4 }}>
              {k}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>{v}</div>
          </div>
        ))}
      </div>

      <a
        href={TICKETS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-lg btn-block btn-mag"
      >
        GET TICKETS ON THE WEBSITE ↗
      </a>

      {G.about.map((p, i) => (
        <div key={i} style={body}>
          {p}
        </div>
      ))}

      <div>
        <h2 className="screen-title" style={{ marginTop: 6 }}>
          {G.rulesTitle.toUpperCase()}
        </h2>
        <div className="card" style={{ gap: 9 }}>
          {G.rules.map(([lead, rest]) => (
            <div key={lead} style={body}>
              <strong style={{ color: "var(--text)" }}>{lead}</strong> {rest}
            </div>
          ))}
        </div>
        <div style={{ ...body, marginTop: 10 }}>{G.rulesAfter}</div>
      </div>

      <div>
        <h2 className="screen-title" style={{ marginTop: 6 }}>
          {G.worldTitle.toUpperCase()}
        </h2>
        {G.world.map((p, i) => (
          <div key={i} style={{ ...body, marginBottom: 10 }}>
            {p}
          </div>
        ))}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {G.scents.map(([head, text]) => (
            <div key={head} className="card" style={{ gap: 6 }}>
              <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.3 }}>{head}</div>
              <div style={{ fontSize: 12.5, lineHeight: 1.55, color: "var(--dim)" }}>{text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
