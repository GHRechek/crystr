import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function FeedPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("handle, display_name, bio, created_at")
    .order("created_at", { ascending: false });

  return (
    <main>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1 style={{ margin: 0 }}>CRYSTR</h1>
        <nav style={{ display: "flex", gap: 12 }}>
          <a href="/settings">Edit profile</a>
          <form action="/auth/signout" method="post">
            <button className="button" type="submit">
              Sign out
            </button>
          </form>
        </nav>
      </header>

      <p className="muted">Everyone on CRYSTR so far:</p>

      {profiles?.length ? (
        profiles.map((profile) => (
          <div className="card" key={profile.handle}>
            <strong>{profile.display_name || profile.handle}</strong>
            <div className="muted">@{profile.handle}</div>
            {profile.bio && <p>{profile.bio}</p>}
          </div>
        ))
      ) : (
        <p className="muted">No profiles yet.</p>
      )}
    </main>
  );
}
