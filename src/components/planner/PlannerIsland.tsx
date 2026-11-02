import * as React from "react";

import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import {
  noteFromHashrate,
  noteFromComponents,
  hashrateRangeForNote,
  requiredHashrate,
  humanHashrate,
  getReliabilityLevels,
  ensureNote,
  combineNotesSerial,
  noteDifference,
  divideNotes,
  scaleNote,
  nbitsToSharenote,
  sharenoteToNBits,
  type ReliabilityLevel,
} from "@/lib/sharenote";

// ---------------------------------------------------------------------------
// Static reference data
// ---------------------------------------------------------------------------

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

const WINDOWS: { label: string; seconds: number }[] = [
  { label: "1 second", seconds: 1 },
  { label: "5 seconds", seconds: 5 },
  { label: "1 minute", seconds: 60 },
  { label: "10 minutes", seconds: 600 },
  { label: "1 hour", seconds: 3600 },
  { label: "24 hours", seconds: 86400 },
];

const LEVELS: ReliabilityLevel[] = getReliabilityLevels();
const DEFAULT_RELIABILITY = "usually_90";
const DEFAULT_UNIT_IDX = 4; // TH/s
const DEFAULT_SECONDS = 5;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Flat (non-discriminated) shape so `.value` / `.error` always type-check even
// with strictNullChecks disabled, where the compiler will not narrow a
// discriminated union on a boolean literal field.
type Safe<T> = { ok: boolean; value?: T; error?: string };

function safe<T>(fn: () => T): Safe<T> {
  try {
    return { ok: true, value: fn() };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function reliabilityLabel(id: string): string {
  return LEVELS.find((l) => l.id === id)?.label ?? id;
}

// ---------------------------------------------------------------------------
// Small presentational pieces
// ---------------------------------------------------------------------------

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </label>
  );
}

function SelectBox({
  value,
  onChange,
  children,
  className,
  "aria-label": ariaLabel,
}: {
  value: string | number;
  onChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      {children}
    </select>
  );
}

function NoteChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 font-mono text-sm font-semibold text-secondary-foreground">
      {children}
    </span>
  );
}

function ErrorLine({ message }: { message: string }) {
  return (
    <p className="mt-2 text-sm text-destructive">
      {message}
    </p>
  );
}

function Disclosure({
  open,
  onToggle,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/40">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span>
          <span className="block text-sm font-semibold text-foreground">{title}</span>
          {subtitle && (
            <span className="mt-0.5 block text-xs text-muted-foreground">{subtitle}</span>
          )}
        </span>
        <svg
          className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && <div className="border-t border-border px-4 py-4">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main island
// ---------------------------------------------------------------------------

export default function PlannerIsland() {
  // Primary (Tab 1) inputs
  const [value, setValue] = React.useState("100");
  const [unitIdx, setUnitIdx] = React.useState(DEFAULT_UNIT_IDX);
  const [seconds, setSeconds] = React.useState<number>(DEFAULT_SECONDS);
  const [reliability, setReliability] = React.useState<string>(DEFAULT_RELIABILITY);

  const [advanced, setAdvanced] = React.useState(false);
  const [labOpen, setLabOpen] = React.useState(false);

  const unit = UNITS[unitIdx] ?? UNITS[0];
  const numeric = Number.parseFloat(value);
  const hps =
    Number.isFinite(numeric) && numeric > 0 ? numeric * unit.mult : NaN;

  // --- Tab 1: hashrate -> note -----------------------------------------
  const primary = React.useMemo(() => {
    if (!Number.isFinite(hps) || hps <= 0) return null;
    return safe(() => {
      const note = noteFromHashrate(hps, seconds, { reliability: reliability as never });
      return { label: note.label, human: humanHashrate(hps).display };
    });
  }, [hps, seconds, reliability]);

  // Cross-reliability sensitivity: max note per level
  const sensitivity = React.useMemo(() => {
    if (!Number.isFinite(hps) || hps <= 0) return null;
    return LEVELS.map((level) => {
      const r = safe(() => noteFromHashrate(hps, seconds, { reliability: level.id as never }).label);
      return { level, note: r.ok ? r.value : "—" };
    });
  }, [hps, seconds]);

  // --- Tab 2: denomination -> required hashrate ------------------------
  const [zStr, setZStr] = React.useState("32");
  const [centsStr, setCentsStr] = React.useState("0");

  const reverse = React.useMemo(() => {
    const z = Number.parseInt(zStr, 10);
    const cents = Number.parseInt(centsStr, 10);
    if (!Number.isFinite(z) || z < 1 || z > 256) {
      return { error: "z must be an integer between 1 and 256." };
    }
    if (!Number.isFinite(cents) || cents < 0 || cents > 99) {
      return { error: "cents must be an integer between 0 and 99." };
    }
    const built = safe(() => noteFromComponents(z, cents));
    if (!built.ok) return { error: built.error };
    const note = built.value;
    const rows = LEVELS.map((level) => {
      const rng = safe(() => hashrateRangeForNote(note, seconds, { reliability: level.id as never }).human());
      const req = safe(() => humanHashrate(requiredHashrate(note, seconds, { reliability: level.id as never }).value).display);
      return {
        level,
        low: rng.ok ? rng.value[0].display : "—",
        high: rng.ok ? rng.value[1].display : "—",
        required: req.ok ? req.value : "—",
      };
    });
    return { label: note.label, rows };
  }, [zStr, centsStr, seconds]);

  // --- Arithmetic Lab --------------------------------------------------
  const [noteA, setNoteA] = React.useState("32Z00");
  const [noteB, setNoteB] = React.useState("31Z50");
  const [factor, setFactor] = React.useState(2);
  const [nbitsHex, setNbitsHex] = React.useState("");

  const lab = React.useMemo(() => {
    const a = safe(() => ensureNote(noteA));
    const b = safe(() => ensureNote(noteB));
    if (!a.ok) return { error: `Note A: ${a.error}` };
    if (!b.ok) return { error: `Note B: ${b.error}` };
    const combine = safe(() => combineNotesSerial([a.value, b.value]).label);
    const diff = safe(() => noteDifference(a.value, b.value).label);
    const divide = safe(() => divideNotes(a.value, b.value));
    const scaled = safe(() => scaleNote(a.value, factor).label);
    const nbitsA = safe(() => sharenoteToNBits(a.value));
    return {
      aLabel: a.value.label,
      bLabel: b.value.label,
      combine: combine.ok ? combine.value : "—",
      diff: diff.ok ? diff.value : "—",
      divide: divide.ok ? divide.value : NaN,
      scaled: scaled.ok ? scaled.value : "—",
      nbitsA: nbitsA.ok ? nbitsA.value : "—",
    };
  }, [noteA, noteB, factor]);

  const nbitsDecode = React.useMemo(() => {
    const cleaned = nbitsHex.trim();
    if (cleaned === "") return null;
    return safe(() => nbitsToSharenote(cleaned).label);
  }, [nbitsHex]);

  // ---------------------------------------------------------------------

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm md:p-7">
      {/* Primary input row */}
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <FieldLabel>Your hashrate</FieldLabel>
          <div className="flex gap-2">
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="flex-1 font-mono"
              aria-label="Hashrate value"
              placeholder="100"
            />
            <div className="w-28 shrink-0">
              <SelectBox
                aria-label="Hashrate unit"
                value={unitIdx}
                onChange={(v) => setUnitIdx(Number.parseInt(v, 10))}
              >
                {UNITS.map((u, i) => (
                  <option key={u.label} value={i}>
                    {u.label}
                  </option>
                ))}
              </SelectBox>
            </div>
          </div>
        </div>
        <div className="text-sm text-muted-foreground sm:pb-2 sm:text-right">
          {LEVELS.find((l) => l.id === reliability)?.label ?? ""} · over{" "}
          {WINDOWS.find((w) => w.seconds === seconds)?.label ?? `${seconds}s`}
        </div>
      </div>

      {/* The one bold answer */}
      <div className="mt-5 rounded-lg border border-border bg-background/60 p-5">
        {primary == null ? (
          <p className="text-muted-foreground">
            Enter a positive hashrate to see the note your rig can print.
          </p>
        ) : primary.ok ? (
          <div>
            <p className="text-sm text-muted-foreground">Your rig prints</p>
            <p className="mt-1 font-mono text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
              {primary.value.label}
            </p>
            <p className="mt-3 leading-relaxed text-foreground/90">
              At <strong>{primary.value.human}</strong>, you will{" "}
              <strong>{reliabilityLabel(reliability).toLowerCase()}</strong> mint a{" "}
              <NoteChip>{primary.value.label}</NoteChip> note or heavier within a{" "}
              {WINDOWS.find((w) => w.seconds === seconds)?.label ?? `${seconds}-second`} window.
            </p>
          </div>
        ) : (
          <ErrorLine message={primary.error} />
        )}
      </div>

      {/* Advanced disclosure */}
      <div className="mt-4">
        <Disclosure
          open={advanced}
          onToggle={() => setAdvanced((v) => !v)}
          title="Advanced"
          subtitle="Tune the window & reliability, see cross-reliability sensitivity, and design a note by denomination."
        >
          {/* Fine controls */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Target window</FieldLabel>
              <SelectBox
                aria-label="Target window"
                value={seconds}
                onChange={(v) => setSeconds(Number.parseInt(v, 10))}
              >
                {WINDOWS.map((w) => (
                  <option key={w.seconds} value={w.seconds}>
                    {w.label}
                  </option>
                ))}
              </SelectBox>
            </div>
            <div>
              <FieldLabel>Reliability</FieldLabel>
              <SelectBox
                aria-label="Reliability"
                value={reliability}
                onChange={(v) => setReliability(v)}
              >
                {LEVELS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </SelectBox>
            </div>
          </div>

          {/* Sensitivity table */}
          <div className="mt-6">
            <h3 className="mt-0 text-sm font-semibold text-foreground">
              Cross-reliability sensitivity
            </h3>
            <p className="mb-3 mt-1 text-xs text-muted-foreground">
              The heaviest note your rig can print at each confidence level, over the selected window.
            </p>
            {sensitivity == null ? (
              <p className="text-sm text-muted-foreground">Enter a hashrate above.</p>
            ) : (
              <div className="overflow-hidden rounded-md border border-border">
                {sensitivity.map(({ level, note }, i) => (
                  <div
                    key={level.id}
                    className={cn(
                      "flex items-center justify-between gap-3 px-3 py-2 text-sm",
                      i > 0 && "border-t border-border",
                      level.id === reliability && "bg-secondary/50",
                    )}
                  >
                    <span className="text-foreground/90">{level.label}</span>
                    <NoteChip>{note}</NoteChip>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator className="my-6" />

          {/* Tab 2: reverse lookup */}
          <div>
            <h3 className="mt-0 text-sm font-semibold text-foreground">
              Design a note &rarr; required hashrate
            </h3>
            <p className="mb-3 mt-1 text-xs text-muted-foreground">
              Pick a denomination and see the hashrate each reliability level needs over the selected window.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Z (1&ndash;256)</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  max={256}
                  step={1}
                  value={zStr}
                  onChange={(e) => setZStr(e.target.value)}
                  className="font-mono"
                  aria-label="Z bits"
                />
              </div>
              <div>
                <FieldLabel>Cents (0&ndash;99)</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  max={99}
                  step={1}
                  value={centsStr}
                  onChange={(e) => setCentsStr(e.target.value)}
                  className="font-mono"
                  aria-label="Cent-Z"
                />
              </div>
            </div>

            {"error" in reverse ? (
              <ErrorLine message={reverse.error} />
            ) : (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">
                  Denomination <NoteChip>{reverse.label}</NoteChip>
                </p>
                <div className="mt-3 overflow-x-auto rounded-md border border-border">
                  <table className="w-full min-w-[460px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border bg-background/60">
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Reliability
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Required hashrate
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Range (this cent band)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {reverse.rows.map((row) => (
                        <tr
                          key={row.level.id}
                          className={cn(
                            "border-b border-border last:border-0",
                            row.level.id === reliability && "bg-secondary/50",
                          )}
                        >
                          <td className="px-3 py-2 text-foreground/90">{row.level.label}</td>
                          <td className="px-3 py-2 font-mono text-foreground">{row.required}</td>
                          <td className="px-3 py-2 font-mono text-muted-foreground">
                            {row.low} &ndash; {row.high}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </Disclosure>
      </div>

      {/* Arithmetic Lab */}
      <div className="mt-4">
        <Disclosure
          open={labOpen}
          onToggle={() => setLabOpen((v) => !v)}
          title="Arithmetic Lab (developer tools)"
          subtitle="Combine, difference, divide, scale and convert note denominations."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Note A</FieldLabel>
              <Input
                value={noteA}
                onChange={(e) => setNoteA(e.target.value)}
                className="font-mono"
                aria-label="Note A"
                placeholder="32Z00"
              />
            </div>
            <div>
              <FieldLabel>Note B</FieldLabel>
              <Input
                value={noteB}
                onChange={(e) => setNoteB(e.target.value)}
                className="font-mono"
                aria-label="Note B"
                placeholder="31Z50"
              />
            </div>
          </div>

          {"error" in lab ? (
            <ErrorLine message={lab.error} />
          ) : (
            <>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Combine (serial)</span>
                  <NoteChip>{lab.combine}</NoteChip>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Difference (A &minus; B)</span>
                  <NoteChip>{lab.diff}</NoteChip>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Divide (A / B)</span>
                  <span className="font-mono font-semibold text-foreground">
                    {Number.isFinite(lab.divide) ? (lab.divide as number).toPrecision(6) : "—"}&times;
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
                  <span className="text-muted-foreground">nBits of A</span>
                  <span className="font-mono text-foreground">{lab.nbitsA}</span>
                </div>
              </div>

              {/* Scale */}
              <div className="mt-6">
                <FieldLabel>Scale Note A &times;{factor.toFixed(1)}</FieldLabel>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={16}
                    step={0.5}
                    value={factor}
                    onChange={(e) => setFactor(Number.parseFloat(e.target.value))}
                    className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
                    aria-label="Scale factor"
                  />
                  <div className="w-24 shrink-0 text-right">
                    <NoteChip>{lab.scaled}</NoteChip>
                  </div>
                </div>
              </div>
            </>
          )}

          <Separator className="my-6" />

          {/* nBits -> label */}
          <div>
            <FieldLabel>Decode nBits &rarr; denomination</FieldLabel>
            <div className="flex gap-2">
              <Input
                value={nbitsHex}
                onChange={(e) => setNbitsHex(e.target.value)}
                className="font-mono"
                aria-label="nBits hex"
                placeholder="e.g. 1d00ffff"
              />
              <div className="w-28 shrink-0 text-right text-sm">
                {nbitsDecode == null ? (
                  <span className="text-muted-foreground">&mdash;</span>
                ) : nbitsDecode.ok ? (
                  <NoteChip>{nbitsDecode.value}</NoteChip>
                ) : (
                  <span className="text-destructive text-xs">invalid</span>
                )}
              </div>
            </div>
            {nbitsDecode && !nbitsDecode.ok && <ErrorLine message={nbitsDecode.error} />}
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            Want the reasoning behind Z-bits and serial aggregation?{" "}
            <a href="/learn/the-z-bit-standard" className="font-medium text-primary underline underline-offset-4">
              Read the Z-bit standard &rarr;
            </a>
          </p>
        </Disclosure>
      </div>
    </div>
  );
}
