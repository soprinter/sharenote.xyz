import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { noteFromHashrate, humanHashrate } from "@/lib/sharenote";

const UNITS: { label: string; mult: number }[] = [
  { label: "H/s", mult: 1 },
  { label: "kH/s", mult: 1e3 },
  { label: "MH/s", mult: 1e6 },
  { label: "GH/s", mult: 1e9 },
  { label: "TH/s", mult: 1e12 },
  { label: "PH/s", mult: 1e15 },
  { label: "EH/s", mult: 1e18 },
  { label: "ZH/s", mult: 1e21 },
];

// Defaults: Usually (90%), 5 second window.
const RELIABILITY = "usually_90";
const SECONDS = 5;

export default function MiniPlanner() {
  // Unique id prefix so the label/control pair up without colliding with the
  // full planner island on the same page.
  const uid = React.useId();
  const hashrateId = `${uid}-hashrate`;

  const [value, setValue] = React.useState("100");
  const [unitIdx, setUnitIdx] = React.useState(4); // TH/s

  const unit = UNITS[unitIdx] ?? UNITS[0];
  const numeric = Number.parseFloat(value);
  const hps = Number.isFinite(numeric) && numeric > 0 ? numeric * unit.mult : NaN;

  const result = React.useMemo(() => {
    if (!Number.isFinite(hps) || hps <= 0) return null;
    try {
      const note = noteFromHashrate(hps, SECONDS, { reliability: RELIABILITY as never });
      return { label: note.label, human: humanHashrate(hps).display, z: note.z };
    } catch {
      return null;
    }
  }, [hps]);

  // A note below 1Z00 is too low to reliably print at this hashrate.
  const tooLow = result != null && result.z < 1;

  return (
    <div className="mini-planner mx-auto max-w-[760px] rounded-2xl border-2 border-[var(--ink)] bg-[var(--panel)] p-5 md:p-7">
      <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <label
            htmlFor={hashrateId}
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]"
          >
            Your hashrate
          </label>
          <div className="flex gap-2">
            <Input
              id={hashrateId}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="flex-1 border-[var(--ink)]/30 bg-transparent font-mono text-base text-[var(--ink)]"
              aria-label="Your hashrate"
              placeholder="100"
            />
            <select
              aria-label="Hashrate unit"
              value={unitIdx}
              onChange={(e) => setUnitIdx(Number.parseInt(e.target.value, 10))}
              className="h-9 w-24 shrink-0 rounded-md border border-[var(--ink)]/30 bg-transparent px-2 text-sm text-[var(--ink)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {UNITS.map((u, i) => (
                <option key={u.label} value={i}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-3 text-sm text-[var(--ink-muted)]">
            Your rig already prints work &mdash; see what it mints.
          </p>
        </div>

        <div className="text-center md:min-w-[200px] md:border-l md:border-[var(--ink)]/15 md:pl-6 md:text-right">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
            Prints a note
          </p>
          <p
            className={cn(
              "mt-1 font-mono text-4xl font-extrabold tracking-tight text-[var(--ink)] md:text-5xl",
              (!result || tooLow) && "opacity-40",
            )}
          >
            {result && !tooLow ? result.label : "—"}
          </p>
          {result &&
            (tooLow ? (
              <p className="mt-1 text-xs text-[var(--ink-muted)]">
                too low to reliably print at this hashrate
              </p>
            ) : (
              <p className="mt-1 text-xs text-[var(--ink-muted)]">
                {result.human} · usually (90%) · 5s
              </p>
            ))}
        </div>
      </div>

      <div className="mt-6 flex justify-center md:justify-start">
        <a
          href="/planner"
          className="mini-planner-cta inline-flex items-center gap-1.5 rounded-lg bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-[var(--bg)] no-underline transition-opacity hover:opacity-85"
        >
          Open the full Planner &rarr;
        </a>
      </div>
    </div>
  );
}
