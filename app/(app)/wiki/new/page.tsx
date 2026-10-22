import { redirect } from "next/navigation";
import { requireMe } from "@/lib/data";
import { NewPageForm } from "./form";

// A witch's business. Everyone else is sent back to the shelf.
export default async function NewWikiPage(props: { searchParams: Promise<{ title?: string }> }) {
  const searchParams = await props.searchParams;
  const { profile } = await requireMe();
  if (!profile.is_witch) redirect("/wiki");
  return <NewPageForm initialTitle={(searchParams.title ?? "").slice(0, 120)} />;
}
