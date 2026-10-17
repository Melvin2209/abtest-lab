import type { Verdict } from "@/lib/stats";

/** Status color + icon + label: the meaning never relies on color alone. */
const STYLES: Record<Verdict["status"], { icon: string; className: string }> = {
  winner: { icon: "✓", className: "bg-green-50 text-[#006300] ring-green-200" },
  loser: { icon: "✕", className: "bg-red-50 text-[#b42323] ring-red-200" },
  inconclusive: { icon: "≈", className: "bg-zinc-100 text-zinc-700 ring-zinc-200" },
  not_enough_data: { icon: "⏳", className: "bg-amber-50 text-amber-800 ring-amber-200" },
  srm: { icon: "⚠", className: "bg-red-50 text-[#b42323] ring-red-200" },
};

export function VerdictBadge({ verdict, size = "md" }: { verdict: Verdict; size?: "md" | "lg" }) {
  const style = STYLES[verdict.status];
  const sizing = size === "lg" ? "px-4 py-2 text-base" : "px-2.5 py-1 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ${sizing} ${style.className}`}
      data-testid="verdict"
      data-status={verdict.status}
    >
      <span aria-hidden>{style.icon}</span>
      {verdict.label}
    </span>
  );
}
