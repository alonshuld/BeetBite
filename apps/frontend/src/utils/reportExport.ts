/** The fields of a report (list item or detail) the export needs. */
export interface ExportableReport {
  id: string;
  date: string;
  initiatorIncome: number | null;
  project: { id: string; name: string; initiatorName: string | null };
}

/**
 * A report on a project with an initiator can't be exported until its
 * initiator income is set — the server would refuse it anyway, so callers
 * check first and skip opening a dialog that can only fail.
 */
export function isMissingInitiatorIncome(report: ExportableReport): boolean {
  return (
    Boolean(report.project.initiatorName) && report.initiatorIncome == null
  );
}
