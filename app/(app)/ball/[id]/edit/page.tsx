import { notFound, redirect } from "next/navigation";
import { requireMe, getArticle } from "@/lib/data";
import { Editor } from "@/components/editor";

export default async function EditArticlePage({ params }: { params: { id: string } }) {
  const { profile } = await requireMe();
  if (!profile.is_witch) redirect("/ball");

  const article = await getArticle(Number(params.id));
  if (!article) notFound();

  return <Editor kind="dispatch" article={article} />;
}
