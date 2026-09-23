import { ReportDocument } from "@/components/ReportDocument";
import { getEvaluation } from "@/lib/server/repository";
import { LocalReportView } from "./local";

export const dynamic = "force-dynamic";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = await getEvaluation(id).catch(() => null);
  if (record) return <ReportDocument record={record} />;
  // Browser-storage fallback for deployments without a database.
  return <LocalReportView id={id} />;
}
