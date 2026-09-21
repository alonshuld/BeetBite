import { useEffect, useState } from "react";
import { ButtonGhost } from "@/components/atoms";
import { useLang } from "@/contexts/useLang";
import type { ProfitSimulation } from "@/features/simulator/useProfitSimulation";
import { Icon } from "@/components/atoms/Icon";

/**
 * Slide duration, matched to the `duration-200` on the drawer and on the
 * page's content inset — the drawer stays mounted this long while closing.
 */
const DRAWER_MS = 200;

/**
 * The slider covers the range margins actually land in, so the useful part of
 * the track isn't squeezed into a fifth of it. Anything above that is still
 * reachable by typing into the number box, and the thumb then parks at the
 * top of the track.
 */
const SLIDER_MAX = 20;
const MARGIN_MAX = 100;

function shekels(amount: number): string {
  return `₪${Math.round(amount).toLocaleString("he-IL")}`;
}

interface MarginSliderProps {
  id: string;
  label: string;
  value: number;
  onChange: (margin: number) => void;
  emphasis?: boolean;
}

/**
 * Range + number input over the same margin — drag for feel, type for
 * precision (and for the rare margin above the slider's range).
 */
function MarginSlider({
  id,
  label,
  value,
  onChange,
  emphasis = false,
}: MarginSliderProps) {
  function commit(raw: number, max: number) {
    if (Number.isNaN(raw)) return;
    onChange(Math.min(max, Math.max(0, raw)));
  }

  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        aria-label={label}
        type="range"
        min={0}
        max={SLIDER_MAX}
        step={0.1}
        value={Math.min(value, SLIDER_MAX)}
        onChange={(e) => commit(parseFloat(e.target.value), SLIDER_MAX)}
        className={`flex-1 min-w-0 ${emphasis ? "accent-beet-bright" : "accent-beet"}`}
      />
      <div className="flex items-center gap-0.5 shrink-0">
        <input
          aria-label={`${label} %`}
          type="number"
          min={0}
          max={MARGIN_MAX}
          step={0.1}
          value={value}
          onChange={(e) => commit(parseFloat(e.target.value), MARGIN_MAX)}
          className="w-14 rounded border border-border bg-surface px-1 py-0.5 text-xs text-text text-end focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <span className="text-xs text-text-muted">%</span>
      </div>
    </div>
  );
}

interface ProfitSimulatorPanelProps {
  simulation: ProfitSimulation;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onExport: () => void;
  exporting: boolean;
}

/**
 * Simulator drawer, closed by default: the page shows stored figures until it
 * is opened, and closing it ends the simulation (the caller resets).
 *
 * It slides in from the side opposite the sidebar — right in LTR, left in RTL
 * — reached by a bookmark tab pinned to that same edge. It sits below the app
 * header, and from `md` up the page content is inset by the same width as it
 * opens, so the drawer pushes the sheets aside instead of covering them.
 * Narrower than that there is no room to push, so it overlays.
 */
export function ProfitSimulatorPanel({
  simulation,
  open,
  onOpen,
  onClose,
  onExport,
  exporting,
}: ProfitSimulatorPanelProps) {
  const { t } = useLang();
  const {
    rows,
    masterMargin,
    isDirty,
    totals,
    setMaster,
    setProjectMargin,
    resetProject,
    reset,
  } = simulation;

  // Kept mounted for the slide-out, so closing animates instead of vanishing.
  const [mounted, setMounted] = useState(open);
  const [slidIn, setSlidIn] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    setSlidIn(false);
    const timer = window.setTimeout(() => setMounted(false), DRAWER_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!mounted || !open) return;
    const frame = requestAnimationFrame(() => setSlidIn(true));
    return () => cancelAnimationFrame(frame);
  }, [mounted, open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // One handle for both directions: it opens the drawer, then rides out with
  // it so the same tab closes it. There is no separate ✕.
  const tab = (
    <button
      type="button"
      onClick={open ? onClose : onOpen}
      aria-expanded={open}
      className={`fixed top-1/2 -translate-y-1/2 z-40 ltr:right-0 rtl:left-0 ltr:rounded-l-[var(--radius)] rtl:rounded-r-[var(--radius)] bg-beet text-white py-4 px-1.5 shadow-lg hover:bg-beet-bright transition-transform duration-200 ${
        open ? "ltr:-translate-x-[340px] rtl:translate-x-[340px]" : ""
      }`}
    >
      <span
        className="text-label font-semibold"
        style={{ writingMode: "vertical-rl" }}
      >
        {t("profitSimulator")}
      </span>
    </button>
  );

  if (!mounted) return tab;

  return (
    <>
      {tab}
      <aside
        aria-label={t("profitSimulator")}
        aria-hidden={!open}
        className={`fixed top-14 bottom-0 z-30 w-[340px] max-w-[86vw] overflow-y-auto bg-surface border-border ltr:right-0 ltr:border-l rtl:left-0 rtl:border-r shadow-xl transition-transform duration-200 flex flex-col gap-4 p-4 ${
          slidIn
            ? "translate-x-0"
            : "ltr:translate-x-full rtl:-translate-x-full pointer-events-none"
        }`}
      >
        <div className="flex flex-col gap-0.5">
          <h3 className="text-label font-semibold text-text-muted">
            {t("profitSimulator")}
          </h3>
          <p className="text-[11px] text-text-dim">
            {t("profitSimulatorSubtitle")}
          </p>
        </div>

        <div className="bg-surface-2 border border-border rounded p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-text">
              {t("allProjects")}
            </span>
            <span className="text-[11px] text-text-dim">
              {rows.length} {t("projects").toLowerCase()}
            </span>
          </div>
          <MarginSlider
            id="sim-master"
            label={t("allProjects")}
            value={masterMargin}
            onChange={setMaster}
            emphasis
          />
        </div>

        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <div
              key={row.report.id}
              className="flex flex-col gap-1.5 border-t border-border pt-3 first:border-t-0 first:pt-0"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text truncate">
                    {row.report.project.name}
                  </p>
                  <p className="text-[11px] text-text-muted">
                    {t("savedMarginLabel")} {row.savedMargin.toFixed(1)}%
                    {row.isPinned && (
                      <span className="ms-1 text-beet-bright">
                        {t("overridden")}
                      </span>
                    )}
                  </p>
                </div>
                {row.isPinned && (
                  <button
                    type="button"
                    onClick={() => resetProject(row.report.project.id)}
                    aria-label={`${t("resetToSavedValues")}: ${row.report.project.name}`}
                    className="shrink-0 text-xs text-text-muted hover:text-text"
                  >
                    <Icon name="close" size={14} />
                  </button>
                )}
              </div>
              <MarginSlider
                id={`sim-${row.report.project.id}`}
                label={row.report.project.name}
                value={row.margin}
                onChange={(margin) =>
                  setProjectMargin(row.report.project.id, margin)
                }
              />
              <div className="flex justify-between text-[11px]">
                <span className="text-text-muted">
                  {t("simProfitLabel")}{" "}
                  <span className="text-success font-medium">
                    {shekels(row.profit)}
                  </span>
                </span>
                <span className="text-text-muted">
                  {t("subcontractorPayment")}:{" "}
                  <span className="text-text font-medium">
                    {shekels(row.subcontractorPayment)}
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1 border-t border-border pt-3 text-xs">
          <div className="flex justify-between">
            <span className="text-text-muted">{t("simulatedProfit")}</span>
            <span className="text-success font-semibold">
              {shekels(totals.profit)}
            </span>
          </div>
          {isDirty && (
            <div className="flex justify-between">
              <span className="text-text-muted">{t("deltaVsSaved")}</span>
              <span
                className={
                  totals.profitDelta >= 0
                    ? "text-success font-semibold"
                    : "text-warning font-semibold"
                }
              >
                {totals.profitDelta >= 0 ? "+" : "−"}
                {shekels(Math.abs(totals.profitDelta))}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <ButtonGhost
            onClick={onExport}
            disabled={exporting}
            className="text-xs py-1 px-3 w-full"
          >
            {t("exportWithSimulator")}
          </ButtonGhost>
          {isDirty && (
            <ButtonGhost onClick={reset} className="text-xs py-1 px-3 w-full">
              {t("resetToSavedValues")}
            </ButtonGhost>
          )}
        </div>
      </aside>
    </>
  );
}
