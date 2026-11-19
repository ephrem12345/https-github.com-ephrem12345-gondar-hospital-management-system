"use client";

import { Fragment, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { cn } from "@/lib/utils/cn";

export interface PermissionRow {
  key: string;
  group: string;
  label: string;
  description?: string;
  /** Roles granted by default in the demo dataset. */
  defaultRoles: string[];
}

const CHECKBOX =
  "h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500/40 disabled:opacity-50";

/**
 * Interactive role/permission matrix (Administration › Permissions).
 * Changes are staged client-side and confirmed before "saving".
 */
export function PermissionsMatrix({
  title,
  roles,
  rows,
  description,
}: {
  title: string;
  description: string;
  roles: string[];
  rows: PermissionRow[];
}) {
  const [granted, setGranted] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const row of rows) {
      for (const role of roles) {
        initial[`${row.key}:${role}`] = row.defaultRoles.includes(role);
      }
    }
    return initial;
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const changedCount = useMemo(() => {
    let count = 0;
    for (const row of rows) {
      for (const role of roles) {
        const key = `${row.key}:${role}`;
        if (granted[key] !== row.defaultRoles.includes(role)) count++;
      }
    }
    return count;
  }, [granted, rows, roles]);

  const groups = useMemo(() => {
    const map = new Map<string, PermissionRow[]>();
    for (const row of rows) {
      const list = map.get(row.group) ?? [];
      list.push(row);
      map.set(row.group, list);
    }
    return [...map.entries()];
  }, [rows]);

  const toggle = (key: string) =>
    setGranted((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleConfirm = async () => {
    // Backend integration point — simulated persistence for this phase.
    await new Promise((resolve) => setTimeout(resolve, 300));
    setConfirmOpen(false);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 4000);
  };

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <>
            {saved ? (
              <span className="text-sm font-medium text-success">Changes saved</span>
            ) : null}
            <Button onClick={() => setConfirmOpen(true)} disabled={changedCount === 0}>
              Save changes{changedCount > 0 ? ` (${changedCount})` : ""}
            </Button>
          </>
        }
      />

      <Card flush>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                <th scope="col" className="px-5 py-3">Permission</th>
                {roles.map((role) => (
                  <th key={role} scope="col" className="px-4 py-3 text-center">
                    {role}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map(([group, groupRows]) => (
                <Fragment key={group}>
                  <tr className="bg-light-blue/60 dark:bg-slate-800/50">
                    <td
                      colSpan={roles.length + 1}
                      className="px-5 py-2 text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-300"
                    >
                      {group}
                    </td>
                  </tr>
                  {groupRows.map((row) => (
                    <tr
                      key={row.key}
                      className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                    >
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-700 dark:text-slate-200">
                          {row.label}
                        </p>
                        {row.description ? (
                          <p className="text-xs text-slate-400">{row.description}</p>
                        ) : null}
                      </td>
                      {roles.map((role) => {
                        const key = `${row.key}:${role}`;
                        return (
                          <td key={role} className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              className={CHECKBOX}
                              checked={granted[key]}
                              onChange={() => toggle(key)}
                              aria-label={`${row.label} — ${role}`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <ConfirmationDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        title="Save permission changes"
        message={cn(
          `${changedCount} permission ${changedCount === 1 ? "entry" : "entries"} will be updated for all affected roles. Users may need to sign in again to see the changes.`,
        )}
        confirmLabel="Save changes"
        tone="primary"
      />
    </>
  );
}
