"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { CreditCard, ExternalLink, RefreshCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";
import { Notice, Field, inputClass } from "@/components/templates/WorkspaceShared";
import { billingApi, type ChapaCheckoutSession, type PaymentVerification } from "@/services/billing";
import { ApiError } from "@/services/api-client";

export function ChapaCheckoutScreen({ title }: { title: string }) {
  const params = useSearchParams();
  const [invoiceId, setInvoiceId] = useState("");
  const [session, setSession] = useState<ChapaCheckoutSession | null>(null);
  const [verification, setVerification] = useState<PaymentVerification | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = useCallback(async (reference: string) => {
    try {
      const result = await billingApi.verifyPayment(reference);
      setVerification(result);
      if (result.status === "PENDING") return false;
      return true;
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Verification failed");
      return true;
    }
  }, []);

  useEffect(() => {
    const reference = params?.get("chapa_ref") ?? params?.get("chapa_simulated_pay");
    if (!reference) return;
    let attempts = 0;
    setVerification({ success: false, status: "PENDING" });
    const timer = window.setInterval(async () => {
      attempts += 1;
      const done = await verify(reference);
      if (done || attempts >= 12) window.clearInterval(timer);
    }, 5000);
    void verify(reference);
    return () => window.clearInterval(timer);
  }, [params, verify]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await billingApi.initializePayment(
        invoiceId.trim(),
        `${window.location.origin}/chapa-checkout`,
      );
      setSession(result);
      if (result.checkoutUrl) window.location.assign(result.checkoutUrl);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not start payment");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title={title} subtitle="Initialize and verify Chapa payments for a hospital invoice." />
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label="Invoice ID" required>
            <input
              className={inputClass}
              value={invoiceId}
              onChange={(event) => setInvoiceId(event.target.value)}
              placeholder="UUID of the invoice to pay"
              required
            />
          </Field>
          <Button type="submit" loading={busy} leftIcon={<CreditCard className="h-4 w-4" />}>
            Pay with Chapa
          </Button>
        </form>
      </Card>

      {error ? <Notice tone="warning">{error}</Notice> : null}
      {session ? (
        <Card>
          <CardHeader title="Payment session created" subtitle={session.isTestMode ? "Simulation gateway — no live money moved." : "Live Chapa session."} />
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-500">Transaction reference</dt><dd className="font-mono">{session.txRef}</dd></div>
            <div><dt className="text-slate-500">Receipt</dt><dd className="font-mono">{session.receiptNumber}</dd></div>
            <div><dt className="text-slate-500">Amount</dt><dd>{session.amount.toFixed(2)} {session.currency}</dd></div>
            <div><dt className="text-slate-500">Status</dt><dd>{verification?.status ?? "Awaiting confirmation"}</dd></div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" href={session.checkoutUrl} rightIcon={<ExternalLink className="h-4 w-4" />}>Open checkout</Button>
            <Button variant="ghost" onClick={() => void verify(session.txRef)} leftIcon={<RefreshCcw className="h-4 w-4" />}>Refresh status</Button>
          </div>
        </Card>
      ) : null}
      {verification ? (
        <Card>
          <CardHeader title="Verification result" />
          {verification.status === "PENDING" ? <LoadingState variant="inline" label="Waiting for Chapa confirmation…" /> : (
            <div className="flex items-start gap-3 text-sm">
              <ShieldCheck className={`h-5 w-5 ${verification.success ? "text-success-600" : "text-danger"}`} />
              <div>
                <p className="font-medium">{verification.success ? "Payment verified and receipt issued" : "Payment was not completed"}</p>
                {verification.receiptNumber ? <p className="text-slate-500">Receipt: {verification.receiptNumber}</p> : null}
                {verification.message ? <p className="text-slate-500">{verification.message}</p> : null}
              </div>
            </div>
          )}
        </Card>
      ) : null}
    </div>
  );
}
