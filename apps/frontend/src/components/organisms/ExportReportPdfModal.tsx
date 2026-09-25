import { useEffect, useState } from "react";
import { useExportProjectReportsPdfMutation } from "@/api/endpoints/project-report-exports";
import { useGetProjectsQuery } from "@/api/endpoints/projects";
import { FormModal } from "@/components/organisms/Modal";
import { Divider, Input, Textarea } from "@/components/atoms";
import { useLang } from "@/contexts/useLang";
import { useToast } from "@/contexts/useToast";
import type { ExportableReport } from "@/utils/reportExport";

interface ExportReportPdfModalProps {
  /** Report being exported, or null when the modal is closed. */
  report: ExportableReport | null;
  onClose: () => void;
}

/**
 * Exports one project report as an account-approval PDF.
 *
 * Export is per report: a report is already one project for one month, so
 * the dialog asks for the free-text approval line, plus the description to
 * print on this one document. That description is seeded from the project's
 * own but belongs to the export alone — editing it here never writes back,
 * the projects screen is where the project's description is changed.
 */
export function ExportReportPdfModal({
  report,
  onClose,
}: ExportReportPdfModalProps) {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const { data: projects = [] } = useGetProjectsQuery();
  const [exportPdf, { isLoading: exporting }] =
    useExportProjectReportsPdfMutation();

  const [approvedFor, setApprovedFor] = useState("");
  const [description, setDescription] = useState("");

  // Seed from the project each time the dialog opens on a report.
  const reportId = report?.id;
  useEffect(() => {
    if (!report) return;
    const project = projects.find((p) => p.id === report.project.id);
    setApprovedFor(project?.lastApprovedFor ?? "");
    setDescription(project?.description ?? "");
    // Only re-seed when a different report opens, not on a projects refetch
    // that would wipe what the user has typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  async function handleExport() {
    if (!report) return;

    try {
      const blob = await exportPdf({
        projectReportId: report.id,
        // Optional: left blank, the document prints the project name alone.
        approvedFor: approvedFor.trim() || undefined,
        description: description.trim() || undefined,
        lang,
      }).unwrap();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `account-approval-${report.date.slice(0, 7)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      onClose();
      toast(t("exportPdf"), "success");
    } catch {
      // The global RTK Query error listener already surfaces a toast with
      // the server's reason (missing company settings, VAT, no report).
    }
  }

  return (
    <FormModal
      open={report !== null}
      onClose={onClose}
      onSubmit={() => void handleExport()}
      title={t("exportPdf")}
      loading={exporting}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-muted">{report?.project.name}</p>
        <Input
          id="export-approved-for"
          label={t("approvedForLabel")}
          placeholder={t("approvedForPlaceholder")}
          value={approvedFor}
          onChange={(e) => setApprovedFor(e.target.value)}
        />
        <Divider />
        <div className="flex flex-col gap-1">
          <p className="text-xs text-text-dim">{t("exportDescriptionHint")}</p>
          <Textarea
            id="export-project-description"
            label={t("description")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>
      </div>
    </FormModal>
  );
}
