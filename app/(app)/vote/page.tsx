import { redirect } from "next/navigation";

/** The motion board lives in the Ball now, as its MOTIONS tab. Old links still land there. */
export default async function VotePage(props: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await props.searchParams;
  redirect(tab === "past" ? "/ball?tab=motions&show=past" : "/ball?tab=motions");
}
