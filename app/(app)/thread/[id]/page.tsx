import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMe, getPostThread } from "@/lib/data";
import { PostCard } from "@/components/post-card";
import { ReplyForm } from "./reply-form";

export default async function ThreadPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { reply?: string };
}) {
  const { userId, profile } = await requireMe();
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  const thread = await getPostThread(id, userId);
  if (!thread) notFound();

  const { post, replies } = thread;

  return (
    <div className="pad" style={{ gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/" className="btn btn-sm">
          ← BACK
        </Link>
        <div className="spacer" />
        <div className="px" style={{ fontSize: 9, color: "var(--muted)" }}>
          {replies.length === 0
            ? "NO REPLIES YET"
            : `${replies.length} ${replies.length === 1 ? "REPLY" : "REPLIES"}`}
        </div>
      </div>

      <PostCard post={post} me={userId} inThread thread={post.id} />

      <ReplyForm parent={post.id} mana={profile.mana} focus={searchParams.reply === "1"} />

      {replies.map((r) => (
        <div key={r.id} style={{ paddingLeft: 14, borderLeft: "2px solid var(--edge)" }}>
          <PostCard post={r} me={userId} inThread thread={post.id} />
        </div>
      ))}
    </div>
  );
}
