import Link from "next/link";
import { requireMe, getPeople, getTopFriends } from "@/lib/data";
import { updateProfile } from "@/lib/actions";
import { hasStarterHandle } from "@/lib/crystr";
import { TopSixPicker } from "./top-six";
import { BannerPicker } from "./banner-picker";
import { bannerOf } from "@/lib/banner";

export default async function EditProfilePage() {
  const { userId, profile } = await requireMe();
  const starter = hasStarterHandle(profile.handle);
  const [people, top] = await Promise.all([getPeople(userId), getTopFriends(userId)]);

  return (
    <div className="pad">
      <h1 className="sr-only">Edit your profile</h1>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/me" className="btn btn-sm">
          ← ME
        </Link>
        <div className="spacer" />
        <div className="px" style={{ fontSize: 11, color: "var(--muted)" }}>
          WORDS ARE FREE HERE
        </div>
      </div>

      <Link href="/me/avatar" className="btn btn-block">
        ☻ {profile.avatar_config ? "CHANGE YOUR FACE" : "MAKE A FACE"}
      </Link>

      <BannerPicker current={bannerOf(profile)} />

      <form action={updateProfile} style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        <div className="field">
          <label htmlFor="handle">HANDLE</label>
          <input
            id="handle"
            name="handle"
            className="input"
            defaultValue={starter ? "" : profile.handle}
            placeholder={starter ? "what the City will call you" : undefined}
            autoFocus={starter}
            required
            maxLength={15}
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
            maxLength={40}
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
            maxLength={500}
            placeholder="Who you are in The City, and what you trade in."
          />
        </div>

        {(
          [
            ["likes", "LIKES", "cold mornings, an honest scale"],
            ["dislikes", "DISLIKES", "the guild tax, pretending to be weather"],
            ["food", "FAVOURITE FOOD", "whatever the low market is selling at dusk"],
            ["obsession", "CURRENT OBSESSION", "the fountain, obviously"],
          ] as const
        ).map(([name, label, placeholder]) => (
          <div className="field" key={name}>
            <label htmlFor={name}>{label}</label>
            <input
              id={name}
              name={name}
              className="input"
              defaultValue={profile[name] ?? ""}
              maxLength={40}
              placeholder={placeholder}
            />
          </div>
        ))}

        <button type="submit" className="btn btn-lg btn-purple btn-block">
          SAVE
        </button>
      </form>

      <TopSixPicker people={people} current={top.map((f) => f.id)} />
    </div>
  );
}
