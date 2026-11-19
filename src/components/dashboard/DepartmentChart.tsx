"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { DepartmentSlice } from "@/types";
import { useTheme } from "@/lib/theme/ThemeProvider";

const PALETTE = [
  "#1565C0",
  "#4D89DC",
  "#16A34A",
  "#F59E0B",
  "#7BA9E7",
  "#94A3B8",
];

export function DepartmentChart({ data }: { data: DepartmentSlice[] }) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  const tooltipBg = dark ? "#101E33" : "#FFFFFF";
  const tooltipBorder = dark ? "#1E2F49" : "#E2E8F0";
  const tooltipText = dark ? "#CBD5E1" : "#334155";

  return (
    <div
      className="h-72 w-full"
      role="img"
      aria-label="Patients by department"
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={PALETTE[index % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: tooltipBg,
              border: `1px solid ${tooltipBorder}`,
              borderRadius: 12,
              color: tooltipText,
              fontSize: 13,
              boxShadow: "0 12px 24px rgba(16,24,40,0.14)",
            }}
            formatter={(value) => [`${value}%`]}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Custom legend keeps labels readable at all breakpoints */}
      <ul className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1.5" aria-hidden>
        {data.map((entry, index) => (
          <li key={entry.name} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: PALETTE[index % PALETTE.length] }}
            />
            {entry.name} · {entry.value}%
          </li>
        ))}
      </ul>
    </div>
  );
}
