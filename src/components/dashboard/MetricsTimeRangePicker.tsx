"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const RANGES = [
  { label: "Last 3 months", value: "3m" },
  { label: "Last 6 months", value: "6m" },
  { label: "Last year", value: "1y" },
] as const;

export type GrowthRange = (typeof RANGES)[number]["value"];

export function MetricsTimeRangePicker({ current }: { current: GrowthRange }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Select
      value={current}
      onValueChange={(v) => router.push(`${pathname}?range=${v}`)}
    >
      <SelectTrigger className="h-7 w-36 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {RANGES.map((r) => (
          <SelectItem key={r.value} value={r.value} className="text-xs">
            {r.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
