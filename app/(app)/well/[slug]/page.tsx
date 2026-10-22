import { notFound } from "next/navigation";
import { requireMe, getQuests } from "@/lib/data";
import { ProofForm } from "./proof-form";

export default async function QuestPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const { userId } = await requireMe();
  const quest = (await getQuests(userId)).find((q) => q.slug === params.slug);
  if (!quest) notFound();

  return <ProofForm quest={quest} userId={userId} />;
}
