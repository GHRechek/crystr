import { requireMe, getBadges } from "@/lib/data";
import { Composer } from "./composer";

export default async function ComposePage(props: { searchParams: Promise<{ badge?: string }> }) {
  const { userId, profile } = await requireMe();
  const { badge: slug } = await props.searchParams;
  const found = slug ? (await getBadges(userId)).find((b) => b.slug === slug && b.witch_approved && !b.earned_at) : undefined;
  return (
    <>
      <h1 className="sr-only">New post</h1>
      <Composer userId={userId} mana={profile.mana} badge={found ? { slug: found.slug, title: found.title, how: found.how } : undefined} />
    </>
  );
}
