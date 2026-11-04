import { requireOrg } from "@/core/session";
import { PageHeader, Card } from "@/core/ui";

export default async function Dashboard() {
  const ctx = await requireOrg();
  return (
    <>
      <PageHeader title="Обзор" subtitle={ctx.orgName} />
      <Card>Дашборд появится на этапе M8.</Card>
    </>
  );
}
