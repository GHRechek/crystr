import { requireMe } from "@/lib/data";
import { Composer } from "./composer";

export default async function ComposePage() {
  const { profile } = await requireMe();
  return (
    <>
      <h1 className="sr-only">New post</h1>
      <Composer mana={profile.mana} />
    </>
  );
}
