import Link from "next/link";
import { requireMe, getPeople, getTopFriends } from "@/lib/data";
import { updateProfile } from "@/lib/actions";
import { TopSixPicker } from "./top-six";

export default async function EditProfilePage() {
  const { userId, profile } = await requireMe();
  const [people, top] = await Promise.all([getPeople(userId), getTopFriends(userId)]);

  return (
    <div className="pad">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/me" className="btn btn-sm">
          ← ME
        </Link>
        <div className="spacer" />
        <div className="px" style={{ fontSize: 9, color: "var(--muted)" }}>
          WORDS ARE FREE HERE
        </div>
      </div>

      <Link href="/me/avatar" className="btn btn-block">
        ☻ {profile.avatar_config ? "CHANGE YOUR FACE" : "MAKE A FACE"}
      </Link>

      <form action={updateProfile} style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        <div className="field">
          <label htmlFor="handle">HANDLE</label>
          <input
            id="handle"
            name="handle"
            className="input"
            defaultValue={profile.handle}
            required
            maxLength={32}
            pattern="[a-zA-Z0-9_.\-]+"
          />
        </div>

        <div className="field">
          <label htmlFor="display_name">DISPLAY NAME</label>
          <input
            id="display_name"
            name="display_name"
            className="input"
            defaultValue={profile.display_name ?? ""}
            maxLength={60}
          />
        </div>

        <div className="field">
          <label htmlFor="bio">ABOUT ME</label>
          <textarea
            id="bio"
            name="bio"
            className="textarea"
            rows={5}
            defaultValue={profile.bio ?? ""}
            maxLength={600}
            placeholder="Who you are in The City, and what you trade in."
          />
        </div>

        <button type="submit" className="btn btn-lg btn-purple btn-block">
          SAVE
        </button>
      </form>

      <TopSixPicker people={people} current={top.map((f) => f.id)} />
    </div>
  );
}
