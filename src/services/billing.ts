import { apiClient } from "./api-client";

export type PlanCode = "FREE" | "BASIC" | "PROFESSIONAL" | "ENTERPRISE";
export type BillingCycle = "MONTHLY" | "ANNUAL";
export type MediaCategory =
  | "HOSPITAL_LOGO"
  | "HOSPITAL_BANNER"
  | "STAFF_AVATAR"
  | "DEPARTMENT_IMAGE"
  | "PATIENT_DOCUMENT"
  | "MEDICAL_REPORT"
  | "PUBLIC_DOCUMENT";

export interface Plan {
  id: string;
  code: PlanCode;
  name: string;
  description: string | null;
  monthlyPrice: string;
  annualPrice: string;
  maxStaff: number;
  maxPatients: number;
}

export interface ChapaCheckoutSession {
  txRef: string;
  receiptNumber: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  checkoutUrl: string;
  isTestMode: boolean;
}

export interface PaymentVerification {
  success: boolean;
  status: "SUCCESSFUL" | "PENDING" | "FAILED";
  paymentId?: string;
  receiptNumber?: string;
  invoiceNumber?: string;
  message?: string;
}

export interface SubscriptionCheckout {
  activated: boolean;
  txRef?: string;
  amount?: number;
  checkoutUrl?: string;
  isTestMode?: boolean;
  subscription?: { id: string; status: string };
}

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  params: Record<string, string>;
  signature: string;
  publicId: string;
  accessMode: "PUBLIC" | "AUTHENTICATED";
  uploadToken: string;
}

export interface PlatformAnalytics {
  hospitals: { total: number; active: number; trial: number; suspended: number; byTier: Record<string, number> };
  metrics: { activeUsers: number; totalPatients: number; totalActiveSubscriptions: number; totalRecurringRevenueEtb: number };
  plans: Plan[];
}

export interface MediaAsset {
  id: string;
  publicId: string;
  secureUrl: string;
  category: MediaCategory;
  mimeType: string;
  sizeBytes: number;
  format: string | null;
  accessMode: "PUBLIC" | "AUTHENTICATED";
  status: string;
  createdAt: string;
}

export const billingApi = {
  plans: () => apiClient.get<Plan[]>("/saas/plans"),
  subscription: () => apiClient.get<{
    hospital: { id: string; name: string; tier: PlanCode; status: string; maxStaff: number; maxPatients: number };
    currentSubscription: { id: string; status: string; cycle: string; currentPeriodEnd: string } | null;
    history: Array<{ id: string; txRef: string; amount: string; status: string; createdAt: string }>;
  }>("/saas/subscription"),
  subscriptionHistory: () => apiClient.get<Array<{ id: string; txRef: string; amount: string; status: string; createdAt: string }>>("/saas/subscriptions/history"),
  checkoutSubscription: (body: { planCode: PlanCode; cycle: BillingCycle; returnUrl?: string }) =>
    apiClient.post<SubscriptionCheckout>("/saas/subscriptions/checkout", body),
  verifySubscription: (txRef: string) =>
    apiClient.get<PaymentVerification>(`/saas/subscriptions/verify/${encodeURIComponent(txRef)}`, undefined, { skipCache: true }),
  cancelSubscription: () => apiClient.post<{ canceled: boolean }>("/saas/subscriptions/cancel"),
  initializePayment: (invoiceId: string, returnUrl?: string) =>
    apiClient.post<ChapaCheckoutSession>("/payments/chapa/initialize", { invoiceId, ...(returnUrl ? { returnUrl } : {}) }),
  verifyPayment: (txRef: string) =>
    apiClient.get<PaymentVerification>(`/payments/chapa/verify/${encodeURIComponent(txRef)}`, undefined, { skipCache: true }),
  receipt: (paymentId: string) => apiClient.get<Record<string, unknown>>(`/payments/receipt/${encodeURIComponent(paymentId)}`),
  analytics: () => apiClient.get<Record<string, unknown>>("/payments/analytics"),
  platformAnalytics: () => apiClient.get<PlatformAnalytics>("/saas/analytics"),
  hospitals: () => apiClient.get<Array<{ id: string; name: string; code: string; tier: PlanCode; status: string; subscriptions: Array<{ status: string }>; _count: { users: number; patients: number } }>>("/saas/hospitals"),
  updateHospitalStatus: (id: string, status: string) => apiClient.patch<{ id: string; status: string }>(`/saas/hospitals/${encodeURIComponent(id)}/status`, { status }),
  signUpload: (category: MediaCategory) => apiClient.post<UploadSignature>("/media/sign-upload", { category }),
  registerAsset: (body: {
    uploadToken: string;
    secureUrl: string;
    category: MediaCategory;
    mimeType: string;
    sizeBytes: number;
    assetTag?: string;
  }) => apiClient.post<MediaAsset>("/media/register-asset", body),
  listAssets: () => apiClient.get<MediaAsset[]>("/media/assets"),
  assetUrl: (id: string) => apiClient.get<{ url: string; expiresAt: string | null }>(`/media/assets/${encodeURIComponent(id)}/url`, undefined, { skipCache: true }),
  deleteAsset: (id: string) => apiClient.delete<{ status: string }>(`/media/assets/${encodeURIComponent(id)}`),
};
