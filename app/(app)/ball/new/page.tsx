import { redirect } from "next/navigation";
import { requireMe } from "@/lib/data";
import { Editor } from "@/components/editor";

export default async function NewArticlePage(
  props: {
    searchParams: Promise<{ kind?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const { profile } = await requireMe();

  // Players file op-eds; dispatches are a witch's business.
  const kind = searchParams.kind === "oped" || !profile.is_witch ? "oped" : "dispatch";
  if (kind === "dispatch" && !profile.is_witch) redirect("/ball");

  return (
    <>
      <h1 className="sr-only">New piece for the Ball</h1>
      <Editor kind={kind} />
    </>
  );
}
