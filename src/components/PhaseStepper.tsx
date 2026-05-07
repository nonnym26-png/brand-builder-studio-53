import { Link } from "@tanstack/react-router";
import { Check, FileText, Palette, Package } from "lucide-react";

type Phase = {
  to: "/phase-1" | "/phase-2" | "/phase-3";
  label: string;
  sub: string;
  icon: typeof FileText;
};

const PHASES: Phase[] = [
  { to: "/phase-1", label: "Phase 1", sub: "Business Information", icon: FileText },
  { to: "/phase-2", label: "Phase 2", sub: "AI Logo Builder", icon: Palette },
  { to: "/phase-3", label: "Phase 3", sub: "Brand Kit PDF", icon: Package },
];

export function PhaseStepper({
  current,
  completed = {},
}: {
  current?: "/phase-1" | "/phase-2" | "/phase-3";
  completed?: Partial<Record<"/phase-1" | "/phase-2" | "/phase-3", boolean>>;
}) {
  return (
    <nav className="flex flex-wrap items-center gap-2">
      {PHASES.map((p, i) => {
        const isActive = current === p.to;
        const isDone = completed[p.to];
        const Icon = p.icon;
        return (
          <div key={p.to} className="flex items-center gap-2">
            <Link
              to={p.to}
              className={`group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                isActive
                  ? "border-foreground bg-foreground text-background"
                  : isDone
                    ? "border-emerald-500/40 bg-emerald-500/10 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/40"
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-current text-[10px]">
                {isDone ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
              </span>
              <span className="leading-tight">
                <span className="block text-[10px] uppercase tracking-widest opacity-70">{p.label}</span>
                <span className="block text-xs">{p.sub}</span>
              </span>
            </Link>
            {i < PHASES.length - 1 && <span className="hidden h-px w-4 bg-border sm:block" />}
          </div>
        );
      })}
    </nav>
  );
}