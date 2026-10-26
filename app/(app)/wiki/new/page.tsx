import { redirect } from "next/navigation";
import { requireMe } from "@/lib/data";
import { getWikiPages } from "@/lib/wiki";
import { NewPageForm } from "./form";

// A witch's business. Everyone else is sent back to the shelf.
export default async function NewWikiPage(props: { searchParams: Promise<{ title?: string }> }) {
  const searchParams = await props.searchParams;
  const { profile } = await requireMe();
  if (!profile.is_witch) redirect("/wiki");
  const pages = (await getWikiPages(true))
    .filter((p) => !p.archived)
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }))
    .map((p) => ({ id: p.id, title: p.title }));
  return (
    <>
      <h1 className="sr-only">New wiki page</h1>
      <NewPageForm initialTitle={(searchParams.title ?? "").slice(0, 120)} pages={pages} />
    </>
  );
}
