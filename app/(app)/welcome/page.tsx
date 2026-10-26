import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMe } from "@/lib/data";
import { Avatar } from "@/components/bits";
import { hasStarterHandle } from "@/lib/crystr";
import { WelcomeForm } from "./form";

/** The first stop for someone new, after the terms: a face, a name, and a place on the
 *  City's books. Everything else opens once they are registered. */
export default async function WelcomePage() {
  const { profile } = await requireMe();
  if (profile.onboarded !== false) redirect("/");

  const starter = hasStarterHandle(profile.handle);

  return (
    <div className="pad" style={{ gap: 14 }}>
      <div>
        <h1 className="screen-title">WELCOME TO THE CITY</h1>
        <div className="screen-intro">
          Three things and you are in: a face, a name, and your place on the City&apos;s books.
          Until then you have 5 mana, and 10 is the most you can hold.
        </div>
      </div>

      <div className="px" style={{ fontSize: 11, color: "var(--pur-pale)" }}>
        1 · YOUR FACE{profile.avatar_config ? " ✓" : ""}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar person={profile} size={56} />
        <Link href="/me/avatar" className="btn" style={{ flex: 1 }}>
          ☻ {profile.avatar_config ? "CHANGE YOUR FACE" : "MAKE YOUR FACE"}
        </Link>
      </div>

      <WelcomeForm
        userId={profile.id}
        handle={starter ? "" : profile.handle}
        displayName={profile.display_name ?? ""}
        hasFace={!!profile.avatar_config}
      />

      <div className="notice">
        Not sure what to write in the registry? The wiki may help. Look around, then come back to
        this page: what you have filled in will still be here.
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <Link href="/wiki" className="btn btn-sm">
            OPEN THE WIKI
          </Link>
        </div>
      </div>
    </div>
  );
}
