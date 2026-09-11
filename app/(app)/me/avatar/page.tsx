import { requireMe } from "@/lib/data";
import { portraitFromId, normalizePortrait } from "@/lib/portrait/core";
import { AvatarBuilder } from "./builder";
import { PortraitUpload } from "./upload";

export default async function AvatarPage() {
  const { userId, profile } = await requireMe();

  // Open on the face they already have — built, or the one derived from their
  // id that the rest of the app has been showing.
  const start = profile.avatar_config
    ? normalizePortrait(profile.avatar_config)
    : portraitFromId(userId);

  return (
    <>
      <div style={{ padding: "16px 16px 0" }}>
        <PortraitUpload userId={userId} current={profile.portrait_url} />
      </div>
      <AvatarBuilder start={start} fresh={!profile.avatar_config} />
    </>
  );
}
