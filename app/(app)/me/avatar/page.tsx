import { requireMe } from "@/lib/data";
import { normalize, DEFAULT_AVATAR } from "@/lib/avatar";
import { AvatarBuilder } from "./builder";

export default async function AvatarPage() {
  const { profile } = await requireMe();
  const start = profile.avatar_config ? normalize(profile.avatar_config) : DEFAULT_AVATAR;
  return <AvatarBuilder start={start} fresh={!profile.avatar_config} />;
}
