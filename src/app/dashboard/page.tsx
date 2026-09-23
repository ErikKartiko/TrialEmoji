import { redirect } from "next/navigation";

/** Convenience alias — the dashboard lives at the root route. */
export default function DashboardRedirect() {
  redirect("/");
}
