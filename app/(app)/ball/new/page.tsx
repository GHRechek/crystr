import { redirect } from "next/navigation";
import { requireMe } from "@/lib/data";
import { Editor } from "@/components/editor";

export default async function NewArticlePage({
  searchParams,
}: {
  searchParams: { kind?: string };
}) {
  const { profile } = await requireMe();

  // Players file op-eds; dispatches are a witch's business.
  const kind = searchParams.kind === "oped" || !profile.is_witch ? "oped" : "dispatch";
  if (kind === "dispatch" && !profile.is_witch) redirect("/ball");

  return <Editor kind={kind} />;
}
