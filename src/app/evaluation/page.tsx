import { redirect } from "next/navigation";

/** /evaluation forwards to the new-evaluation flow. */
export default function EvaluationRedirect() {
  redirect("/evaluation/new");
}
