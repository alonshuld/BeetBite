import { useCallback, useEffect, useMemo, useState } from "react";
import { computeSubcontractorRemainder } from "@/utils/subcontractorPayment";

/**
 * The slice of a project report the simulator needs. Structural, so a full
 * `ProjectReport` from the API satisfies it without a cast.
 */
export interface SimulatableReport {
  id: string;
  project: { id: string; name: string };
  totalIncome: number;
  profitMargin: number;
  supplierPayments: { amount: number }[];
}

export interface SimulationRow {
  report: SimulatableReport;
  /** The margin in force for this report: pinned → master → saved. */
  margin: number;
  /** The margin stored on the report, untouched by the simulator. */
  savedMargin: number;
  /** True when `margin` differs from `savedMargin`. */
  isSimulated: boolean;
  /** True when this project's own slider was moved (master no longer drives it). */
  isPinned: boolean;
  profit: number;
  subcontractorPayment: number;
  savedProfit: number;
  savedSubcontractorPayment: number;
}

export interface ProfitSimulation {
  rows: SimulationRow[];
  /** Value shown on the master slider — the average saved margin until moved. */
  masterMargin: number;
  /** True once the master slider has been moved (vs. merely displaying the average). */
  masterEngaged: boolean;
  /** True when anything at all is being simulated. */
  isDirty: boolean;
  totals: {
    income: number;
    profit: number;
    subcontractorPayment: number;
    savedProfit: number;
    savedSubcontractorPayment: number;
    profitDelta: number;
  };
  /** Only the projects whose margin actually differs from the stored one. */
  overrides: { projectId: string; margin: number }[];
  /** Effective margin for one project id, or undefined when not simulated. */
  simulatedMarginFor: (projectId: string) => number | undefined;
  setMaster: (margin: number) => void;
  setProjectMargin: (projectId: string, margin: number) => void;
  resetProject: (projectId: string) => void;
  reset: () => void;
}

/**
 * Transient profit-margin simulation over one client's reports for one month.
 *
 * Two layers: a master margin applied to every project, and per-project pins
 * that survive later master moves. Nothing here is ever written back — the
 * overrides are only read by the client-simulated PDF export.
 *
 * `resetKey` clears both layers when it changes (client or month switch).
 */
export function useProfitSimulation(
  reports: SimulatableReport[],
  resetKey: string,
): ProfitSimulation {
  const [master, setMasterState] = useState<number | null>(null);
  const [pinned, setPinned] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    setMasterState(null);
    setPinned(new Map());
  }, [resetKey]);

  // With no master set the slider still needs a position: the average of the
  // saved margins is the honest "where the client sits today" starting point.
  const averageSavedMargin = useMemo(() => {
    if (reports.length === 0) return 0;
    const sum = reports.reduce((acc, r) => acc + r.profitMargin, 0);
    return Math.round((sum / reports.length) * 10) / 10;
  }, [reports]);

  const rows = useMemo<SimulationRow[]>(
    () =>
      reports.map((report) => {
        const pin = pinned.get(report.project.id);
        const margin = pin ?? master ?? report.profitMargin;
        const simulated = computeSubcontractorRemainder({
          totalIncome: report.totalIncome,
          profitMargin: margin,
          supplierPayments: report.supplierPayments,
        });
        const saved = computeSubcontractorRemainder({
          totalIncome: report.totalIncome,
          profitMargin: report.profitMargin,
          supplierPayments: report.supplierPayments,
        });
        return {
          report,
          margin,
          savedMargin: report.profitMargin,
          isSimulated: margin !== report.profitMargin,
          isPinned: pin !== undefined,
          profit: simulated.profit,
          subcontractorPayment: simulated.subcontractorPayment,
          savedProfit: saved.profit,
          savedSubcontractorPayment: saved.subcontractorPayment,
        };
      }),
    [reports, master, pinned],
  );

  const totals = useMemo(() => {
    const acc = {
      income: 0,
      profit: 0,
      subcontractorPayment: 0,
      savedProfit: 0,
      savedSubcontractorPayment: 0,
      profitDelta: 0,
    };
    for (const row of rows) {
      acc.income += row.report.totalIncome;
      acc.profit += row.profit;
      acc.subcontractorPayment += row.subcontractorPayment;
      acc.savedProfit += row.savedProfit;
      acc.savedSubcontractorPayment += row.savedSubcontractorPayment;
    }
    acc.profitDelta = acc.profit - acc.savedProfit;
    return acc;
  }, [rows]);

  const overrides = useMemo(
    () =>
      rows
        .filter((row) => row.isSimulated)
        .map((row) => ({
          projectId: row.report.project.id,
          margin: row.margin,
        })),
    [rows],
  );

  const simulatedMarginFor = useCallback(
    (projectId: string) => {
      const row = rows.find((r) => r.report.project.id === projectId);
      return row?.isSimulated ? row.margin : undefined;
    },
    [rows],
  );

  const setProjectMargin = useCallback((projectId: string, margin: number) => {
    setPinned((prev) => new Map(prev).set(projectId, margin));
  }, []);

  const resetProject = useCallback((projectId: string) => {
    setPinned((prev) => {
      const next = new Map(prev);
      next.delete(projectId);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setMasterState(null);
    setPinned(new Map());
  }, []);

  return {
    rows,
    masterMargin: master ?? averageSavedMargin,
    masterEngaged: master !== null,
    isDirty: master !== null || pinned.size > 0,
    totals,
    overrides,
    simulatedMarginFor,
    setMaster: setMasterState,
    setProjectMargin,
    resetProject,
    reset,
  };
}
