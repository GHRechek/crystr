import { notFound, redirect } from "next/navigation";
import { requireMe, getArticle } from "@/lib/data";
import { Editor } from "@/components/editor";

export default async function EditArticlePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { profile } = await requireMe();
  if (!profile.is_witch) redirect("/ball");

  const article = await getArticle(Number(params.id));
  if (!article) notFound();

  return <Editor kind="dispatch" article={article} />;
}
