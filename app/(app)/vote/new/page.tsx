import { redirect } from "next/navigation";
import { requireMe, getPlaintiffSince } from "@/lib/data";
import { MotionComposer } from "./composer";

export default async function NewMotionPage() {
  const { profile, userId } = await requireMe();
  if (!profile.is_witch) redirect("/vote");
  // Creating a motion needs a Registered Plaintiff: send them to the form first.
  if (!(await getPlaintiffSince(userId))) redirect("/me/plaintiff");
  return <MotionComposer />;
}
