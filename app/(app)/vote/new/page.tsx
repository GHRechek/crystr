import { redirect } from "next/navigation";
import { requireMe } from "@/lib/data";
import { MotionComposer } from "./composer";

export default async function NewMotionPage() {
  const { profile } = await requireMe();
  if (!profile.is_witch) redirect("/vote");
  return <MotionComposer />;
}
