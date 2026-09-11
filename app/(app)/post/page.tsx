import { requireMe } from "@/lib/data";
import { Composer } from "./composer";

export default async function ComposePage() {
  const { profile } = await requireMe();
  return <Composer mana={profile.mana} />;
}
