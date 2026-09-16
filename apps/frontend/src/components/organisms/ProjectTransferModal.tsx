import { useEffect, useState } from "react";
import {
  useGetProjectClientAssignmentsQuery,
  useTransferProjectMutation,
  useDeleteProjectClientAssignmentMutation,
} from "@/api/endpoints/project-client-assignments";
import { useGetClientsQuery } from "@/api/endpoints/clients";
import { FormModal } from "@/components/organisms/Modal";
import { Select } from "@/components/atoms/Select";
import { Input } from "@/components/atoms/Input";
import { ButtonIcon } from "@/components/atoms";
import { FormGroup } from "@/components/molecules/FormGroup";
import { useLang } from "@/contexts/useLang";
import { useToast } from "@/contexts/useToast";
import { formatYM } from "@/utils/formatMonth";

interface ProjectTransferModalProps {
  /** Project being transferred, or null when the modal is closed. */
  project: { id: string; name: string; clientId: string } | null;
  onClose: () => void;
}

/** `YYYY-MM` for an ISO timestamp — what `<input type="month">` expects. */
function toYearMonth(iso: string): string {
  return iso.slice(0, 7);
}

function currentYearMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/**
 * Moves a project to a different client from a chosen month onward.
 *
 * History is frozen: months before the transfer keep whichever client owned
 * them. The timeline below the form makes that visible — and makes a mistyped
 * month obvious — so a wrong transfer can be spotted and removed.
 */
export function ProjectTransferModal({
  project,
  onClose,
}: ProjectTransferModalProps) {
  const { t, lang } = useLang();
  const { toast } = useToast();

  const { data: clients = [] } = useGetClientsQuery();
  const { data: timeline = [] } = useGetProjectClientAssignmentsQuery(
    project?.id ?? "",
    { skip: !project },
  );
  const [transferProject, { isLoading: transferring }] =
    useTransferProjectMutation();
  const [removeAssignment] = useDeleteProjectClientAssignmentMutation();

  const [clientId, setClientId] = useState("");
  const [month, setMonth] = useState(currentYearMonth());

  useEffect(() => {
    if (project) {
      setClientId("");
      setMonth(currentYearMonth());
    }
  }, [project]);

  async function handleSubmit() {
    if (!project || !clientId) return;
    const result = await transferProject({
      projectId: project.id,
      clientId,
      // The backend normalises to the first of the month; be explicit anyway.
      effectiveFrom: `${month}-01`,
    });
    if (!("error" in result)) {
      toast(t("projectTransferred"), "success");
      onClose();
    }
  }

  return (
    <FormModal
      open={project !== null}
      onClose={onClose}
      onSubmit={() => void handleSubmit()}
      title={`${t("transferProject")} — ${project?.name ?? ""}`}
      loading={transferring}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-muted">{t("transferProjectHint")}</p>

        <FormGroup>
          <Select
            id="transfer-client"
            label={t("newClient")}
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
          >
            <option value="">{t("selectClientPlaceholder")}</option>
            {clients
              .filter((c) => c.id !== project?.clientId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </Select>
        </FormGroup>

        <FormGroup>
          <Input
            id="transfer-month"
            label={t("effectiveFromMonth")}
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            required
          />
        </FormGroup>

        {timeline.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              {t("ownershipTimeline")}
            </h3>
            <ul className="flex flex-col gap-1">
              {timeline.map((assignment, i) => {
                const next = timeline[i + 1];
                const isEarliest = i === 0;
                return (
                  <li
                    key={assignment.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="text-text">
                      {assignment.clientName}{" "}
                      <span className="text-text-muted">
                        {next
                          ? `${t("untilMonth")} ${formatYM(
                              toYearMonth(next.effectiveFrom),
                              lang,
                            )}`
                          : t("toDate")}
                      </span>
                    </span>
                    {/* The earliest assignment covers the whole of the
                        project's history — the backend refuses to remove it. */}
                    {!isEarliest && (
                      <ButtonIcon
                        onClick={() => void removeAssignment(assignment.id)}
                        title={t("removeTransfer")}
                        className="hover:text-danger hover:border-danger"
                      >
                        ✕
                      </ButtonIcon>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </FormModal>
  );
}
