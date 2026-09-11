import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export default async function SettingsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("handle, display_name, bio")
    .eq("id", user.id)
    .single();

  async function updateProfile(formData: FormData) {
    "use server";

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const handle = String(formData.get("handle") || "").trim();
    const displayName = String(formData.get("display_name") || "").trim();
    const bio = String(formData.get("bio") || "").trim();

    await supabase
      .from("profiles")
      .update({
        handle,
        display_name: displayName,
        bio,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    revalidatePath("/");
    redirect("/");
  }

  return (
    <main>
      <h1>Edit profile</h1>
      <form action={updateProfile}>
        <label>
          Handle
          <input
            className="field"
            name="handle"
            defaultValue={profile?.handle ?? ""}
            required
          />
        </label>
        <label>
          Display name
          <input
            className="field"
            name="display_name"
            defaultValue={profile?.display_name ?? ""}
          />
        </label>
        <label>
          Bio
          <textarea
            className="field"
            name="bio"
            rows={4}
            defaultValue={profile?.bio ?? ""}
          />
        </label>
        <button className="button" type="submit">
          Save
        </button>
      </form>
      <p>
        <a href="/">&larr; Back</a>
      </p>
    </main>
  );
}
