"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BadgeCheck, CreditCard, ExternalLink, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";
import { Notice } from "@/components/templates/WorkspaceShared";
import { billingApi, type BillingCycle, type Plan, type PlanCode, type PaymentVerification } from "@/services/billing";
import { ApiError } from "@/services/api-client";

interface SubscriptionOverview {
  hospital: { id: string; name: string; tier: PlanCode; status: string; maxStaff: number; maxPatients: number };
  currentSubscription: { id: string; status: string; cycle: string; currentPeriodEnd: string } | null;
  history: Array<{ id: string; txRef: string; amount: string; status: string; createdAt: string }>;
}

export function SubscriptionScreen({ title }: { title: string }) {
  const params = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [overview, setOverview] = useState<SubscriptionOverview | null>(null);
  const [verification, setVerification] = useState<PaymentVerification | null>(null);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [planList, current] = await Promise.all([billingApi.plans(), billingApi.subscription()]);
      setPlans(planList);
      setOverview(current);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not load subscription data");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const reference = params.get("chapa_ref");
    if (!reference) return;
    let attempts = 0;
    const timer = window.setInterval(async () => {
      attempts += 1;
      try {
        const result = await billingApi.verifySubscription(reference);
        setVerification(result);
        if (result.status !== "PENDING" || attempts >= 12) {
          window.clearInterval(timer);
          void load();
        }
      } catch (caught) {
        setError(caught instanceof ApiError ? caught.message : "Subscription verification failed");
        window.clearInterval(timer);
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [params, load]);

  async function checkout(planCode: PlanCode, cycle: BillingCycle) {
    setBusyPlan(`${planCode}-${cycle}`);
    setError(null);
    try {
      const result = await billingApi.checkoutSubscription({
        planCode,
        cycle,
        returnUrl: `${window.location.origin}/subscription`,
      });
      if (result.activated) {
        await load();
        return;
      }
      if (result.checkoutUrl) window.location.assign(result.checkoutUrl);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Checkout could not be started");
    } finally {
      setBusyPlan(null);
    }
  }

  async function cancel() {
    if (!window.confirm("Cancel the current hospital subscription?")) return;
    try {
      await billingApi.cancelSubscription();
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Cancellation failed");
    }
  }

  if (!overview) return <LoadingState variant="page" />;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title={title} subtitle={overview.hospital.name} actions={<Button variant="secondary" size="sm" onClick={() => void load()} leftIcon={<RefreshCcw className="h-4 w-4" />}>Refresh</Button>} />
        <div className="grid gap-4 sm:grid-cols-4">
          <div><p className="text-xs uppercase text-slate-500">Current tier</p><p className="text-lg font-semibold">{overview.hospital.tier}</p></div>
          <div><p className="text-xs uppercase text-slate-500">Status</p><p className="text-lg font-semibold">{overview.hospital.status}</p></div>
          <div><p className="text-xs uppercase text-slate-500">Staff limit</p><p className="text-lg font-semibold">{overview.hospital.maxStaff}</p></div>
          <div><p className="text-xs uppercase text-slate-500">Patient limit</p><p className="text-lg font-semibold">{overview.hospital.maxPatients}</p></div>
        </div>
        {overview.currentSubscription ? (
          <p className="mt-4 text-sm text-slate-500">
            Subscription {overview.currentSubscription.status} · {overview.currentSubscription.cycle} · ends {new Date(overview.currentSubscription.currentPeriodEnd).toLocaleDateString()}
          </p>
        ) : null}
        <div className="mt-4"><Button variant="danger" size="sm" onClick={() => void cancel()}>Cancel subscription</Button></div>
      </Card>

      {error ? <Notice tone="warning">{error}</Notice> : null}
      {verification ? <Notice>{verification.success ? "Subscription payment verified." : verification.message ?? "Payment is still pending."}</Notice> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => (
          <Card key={plan.id} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{plan.name}</h3>
              {plan.code === overview.hospital.tier ? <BadgeCheck className="h-5 w-5 text-success-600" /> : null}
            </div>
            <p className="text-sm text-slate-500">{plan.description ?? "Hospital plan"}</p>
            <p className="text-2xl font-bold">{Number(plan.monthlyPrice).toLocaleString()} <span className="text-sm font-normal">ETB/mo</span></p>
            <p className="text-xs text-slate-500">Up to {plan.maxStaff} staff · {plan.maxPatients} patients</p>
            <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
              <Button size="sm" loading={busyPlan === `${plan.code}-MONTHLY`} onClick={() => void checkout(plan.code, "MONTHLY")}>Monthly</Button>
              <Button variant="secondary" size="sm" loading={busyPlan === `${plan.code}-ANNUAL`} onClick={() => void checkout(plan.code, "ANNUAL")} leftIcon={<CreditCard className="h-4 w-4" />}>Annual</Button>
            </div>
          </Card>
        ))}
      </div>

      <Card flush>
        <CardHeader title="Payment history" />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900/50"><tr><th className="px-5 py-3">Reference</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Date</th><th className="px-5 py-3"><ExternalLink className="h-4 w-4" /></th></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {overview.history.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-5 py-3 font-mono text-xs">{payment.txRef}</td>
                  <td className="px-5 py-3">{Number(payment.amount).toLocaleString()} ETB</td>
                  <td className="px-5 py-3">{payment.status}</td>
                  <td className="px-5 py-3">{new Date(payment.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3"><Button size="sm" variant="ghost" onClick={() => void billingApi.verifySubscription(payment.txRef).then(() => void load())}>Verify</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
