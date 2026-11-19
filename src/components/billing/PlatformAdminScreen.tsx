"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";
import { Notice } from "@/components/templates/WorkspaceShared";
import { billingApi, type PlatformAnalytics } from "@/services/billing";
import { ApiError } from "@/services/api-client";

interface PlatformHospital {
  id: string;
  name: string;
  code: string;
  tier: string;
  status: string;
  subscriptions: Array<{ status: string }>;
  _count: { users: number; patients: number };
}

export function PlatformAdminScreen({ title }: { title: string }) {
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [hospitals, setHospitals] = useState<PlatformHospital[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [summary, list] = await Promise.all([billingApi.platformAnalytics(), billingApi.hospitals()]);
      setAnalytics(summary);
      setHospitals(list);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Super administrator access is required");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function setStatus(id: string, status: string) {
    try { await billingApi.updateHospitalStatus(id, status); await load(); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : "Status update failed"); }
  }

  if (!analytics) return <LoadingState variant="page" />;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title={title} subtitle="Platform-wide subscription and tenant overview" actions={<Button size="sm" variant="secondary" onClick={() => void load()} leftIcon={<RefreshCcw className="h-4 w-4" />}>Refresh</Button>} />
        {error ? <Notice tone="warning">{error}</Notice> : null}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div><p className="text-xs uppercase text-slate-500">Hospitals</p><p className="text-2xl font-bold">{analytics.hospitals?.total ?? 0}</p></div>
          <div><p className="text-xs uppercase text-slate-500">Active subscriptions</p><p className="text-2xl font-bold">{analytics.metrics?.totalActiveSubscriptions ?? 0}</p></div>
          <div><p className="text-xs uppercase text-slate-500">Monthly recurring revenue</p><p className="text-2xl font-bold">{Number(analytics.metrics?.totalRecurringRevenueEtb ?? 0).toLocaleString()} ETB</p></div>
          <div><p className="text-xs uppercase text-slate-500">Patients</p><p className="text-2xl font-bold">{analytics.metrics?.totalPatients ?? 0}</p></div>
        </div>
      </Card>

      <Card flush>
        <CardHeader title="Hospitals" />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900/50">
              <tr><th className="px-5 py-3">Hospital</th><th className="px-5 py-3">Code</th><th className="px-5 py-3">Tier</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Users</th><th className="px-5 py-3">Patients</th><th className="px-5 py-3">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {hospitals.map((hospital) => (
                <tr key={hospital.id}>
                  <td className="px-5 py-3 font-medium">{hospital.name}</td>
                  <td className="px-5 py-3 font-mono text-xs">{hospital.code}</td>
                  <td className="px-5 py-3">{hospital.tier}</td>
                  <td className="px-5 py-3">{hospital.status}</td>
                  <td className="px-5 py-3">{hospital._count.users}</td>
                  <td className="px-5 py-3">{hospital._count.patients}</td>
                  <td className="px-5 py-3 flex gap-1">
                    <Button size="sm" variant="secondary" onClick={() => void setStatus(hospital.id, "ACTIVE")}>Activate</Button>
                    <Button size="sm" variant="danger" onClick={() => void setStatus(hospital.id, "SUSPENDED")}>Suspend</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
