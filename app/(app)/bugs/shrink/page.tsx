import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMe } from "@/lib/data";
import { Shrinker } from "./shrinker";

/** A witch's tool: shrink the pictures that went up before the app shrank them on the phone. */
export default async function ShrinkPage() {
  const { profile } = await requireMe();
  if (!profile.is_witch) redirect("/me");
  return (
    <div className="pad" style={{ gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/bugs" className="btn btn-sm">← BUGS</Link>
      </div>
      <div>
        <h1 className="screen-title">SHRINK PICTURES</h1>
        <div className="screen-intro">
          Pictures over 400 KB in the proofs bucket. Each is fetched, shrunk here in your browser the way the app
          now shrinks them on the phone, and put back in its place, so the posts keep pointing at it.
        </div>
      </div>
      <Shrinker />
    </div>
  );
}
