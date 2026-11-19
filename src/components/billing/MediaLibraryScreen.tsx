"use client";

import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { ExternalLink, FileUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";
import { Field, inputClass, Notice } from "@/components/templates/WorkspaceShared";
import { billingApi, type MediaAsset, type MediaCategory } from "@/services/billing";
import { ApiError } from "@/services/api-client";

const categories: MediaCategory[] = [
  "HOSPITAL_LOGO", "HOSPITAL_BANNER", "STAFF_AVATAR", "DEPARTMENT_IMAGE",
  "PATIENT_DOCUMENT", "MEDICAL_REPORT", "PUBLIC_DOCUMENT",
];

export function MediaLibraryScreen({ title }: { title: string }) {
  const [assets, setAssets] = useState<MediaAsset[] | null>(null);
  const [category, setCategory] = useState<MediaCategory>("HOSPITAL_LOGO");
  const [assetTag, setAssetTag] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setAssets(await billingApi.listAssets()); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : "Could not load media assets"); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function upload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const signed = await billingApi.signUpload(category);
      const form = new FormData();
      for (const [key, value] of Object.entries(signed.params)) form.append(key, value);
      form.append("signature", signed.signature);
      form.append("api_key", signed.apiKey);
      form.append("file", file);
      const resourceType = signed.params.resource_type === "raw" ? "raw" : "image";
      const response = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/${resourceType}/upload`, {
        method: "POST",
        body: form,
      });
      const uploaded = await response.json() as { secure_url?: string; bytes?: number; error?: { message?: string } };
      if (!response.ok || !uploaded.secure_url || uploaded.bytes === undefined) {
        throw new Error(uploaded.error?.message ?? "Cloudinary upload failed");
      }
      await billingApi.registerAsset({
        uploadToken: signed.uploadToken,
        secureUrl: uploaded.secure_url,
        category,
        mimeType: file.type,
        sizeBytes: uploaded.bytes,
        ...(assetTag ? { assetTag } : {}),
      });
      setFile(null);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : caught instanceof Error ? caught.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function openAsset(id: string) {
    try {
      const { url } = await billingApi.assetUrl(id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not open asset");
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this media asset?")) return;
    try { await billingApi.deleteAsset(id); await load(); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : "Could not delete asset"); }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title={title} subtitle="Uploads are signed server-side and verified with Cloudinary before registration." />
        {error ? <Notice tone="warning">{error}</Notice> : null}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <Field label="Category" required>
            <select className={inputClass} value={category} onChange={(event) => setCategory(event.target.value as MediaCategory)}>
              {categories.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
            </select>
          </Field>
          <Field label="Asset tag (optional)">
            <input className={inputClass} value={assetTag} onChange={(event) => setAssetTag(event.target.value)} placeholder="Patient or record identifier" />
          </Field>
          <Field label="File" required>
            <input
              className={inputClass}
              type="file"
              onChange={(event: ChangeEvent<HTMLInputElement>) => setFile(event.target.files?.[0] ?? null)}
            />
          </Field>
          <Button onClick={() => void upload()} loading={busy} disabled={!file} leftIcon={<FileUp className="h-4 w-4" />}>Upload</Button>
        </div>
      </Card>

      <Card flush>
        <CardHeader title="Registered assets" />
        {!assets ? <LoadingState variant="inline" /> : assets.length === 0 ? <p className="px-5 py-6 text-sm text-slate-500">No media assets yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900/50">
                <tr><th className="px-5 py-3">Category</th><th className="px-5 py-3">Public ID</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Size</th><th className="px-5 py-3">Access</th><th className="px-5 py-3">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {assets.map((asset) => (
                  <tr key={asset.id}>
                    <td className="px-5 py-3">{asset.category.replaceAll("_", " ")}</td>
                    <td className="px-5 py-3 font-mono text-xs">{asset.publicId}</td>
                    <td className="px-5 py-3">{asset.mimeType}</td>
                    <td className="px-5 py-3">{Math.round(asset.sizeBytes / 1024)} KB</td>
                    <td className="px-5 py-3">{asset.accessMode}</td>
                    <td className="px-5 py-3 flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => void openAsset(asset.id)} rightIcon={<ExternalLink className="h-4 w-4" />}>Open</Button>
                      <Button size="sm" variant="danger" onClick={() => void remove(asset.id)} rightIcon={<Trash2 className="h-4 w-4" />}>Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
