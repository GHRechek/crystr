import { requireMe } from "@/lib/data";
import { normalize, avatarFromId } from "@/lib/avatar";
import { AvatarBuilder } from "./builder";

export default async function AvatarPage() {
  const { userId, profile } = await requireMe();

  // Open on the face they already have — built, or the one derived from
  // their id that the rest of the app has been showing.
  const start = profile.avatar_config
    ? normalize(profile.avatar_config)
    : avatarFromId(userId);

  return <AvatarBuilder start={start} fresh={!profile.avatar_config} />;
}
