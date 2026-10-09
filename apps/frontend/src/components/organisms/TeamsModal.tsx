import { useState } from "react";
import { useLang } from "@/contexts/useLang";
import { useFieldCheck } from "@/hooks/useFieldCheck";
import {
  useGetSubcontractorsQuery,
  useGetSubcontractorTeamsQuery,
  useCreateSubcontractorTeamMutation,
  useUpdateSubcontractorTeamMutation,
  useDeleteSubcontractorTeamMutation,
  type SubcontractorTeam,
} from "@/api/endpoints/subcontractors";
import {
  ButtonDanger,
  ButtonGhost,
  ButtonIcon,
  ButtonPrimary,
  EmptyState,
  Icon,
} from "@/components/atoms";
import { Modal } from "@/components/organisms/Modal";
import { teamLabel } from "@/utils/subcontractorTeams";

const CHECKBOX = "block h-4 w-4 shrink-0 cursor-pointer accent-beet";

interface TeamsModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Lists the subcontractor teams and creates, edits and disbands them. One
 * modal that swaps between the list and the member picker, rather than a
 * modal stacked on a modal (both would close on the same Escape).
 */
export function TeamsModal({ open, onClose }: TeamsModalProps) {
  const { t } = useLang();
  const checkFields = useFieldCheck();
  const { data: subcontractors = [] } = useGetSubcontractorsQuery();
  const { data: teams = [] } = useGetSubcontractorTeamsQuery();
  const [createTeam, { isLoading: creating }] =
    useCreateSubcontractorTeamMutation();
  const [updateTeam, { isLoading: updating }] =
    useUpdateSubcontractorTeamMutation();
  const [deleteTeam, { isLoading: deleting }] =
    useDeleteSubcontractorTeamMutation();

  // null: the list. Otherwise the picker, for a new team ("new") or an
  // existing one.
  const [editing, setEditing] = useState<SubcontractorTeam | "new" | null>(
    null,
  );
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [disbandTarget, setDisbandTarget] = useState<string | null>(null);

  function close() {
    setEditing(null);
    setDisbandTarget(null);
    onClose();
  }

  function openForm(team: SubcontractorTeam | "new") {
    setEditing(team);
    setMemberIds(team === "new" ? [] : team.members.map((m) => m.id));
    setDisbandTarget(null);
  }

  function toggleMember(id: string) {
    setMemberIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  }

  async function handleSave() {
    if (
      !checkFields([
        [
          t("teamMembers"),
          memberIds.length === 0
            ? "missing"
            : memberIds.length < 2 && "invalid",
        ],
      ])
    )
      return;
    const result =
      editing === "new"
        ? await createTeam({ memberIds })
        : await updateTeam({ id: editing!.id, memberIds });
    if (!("error" in result)) setEditing(null);
  }

  async function handleDisband(id: string) {
    const result = await deleteTeam(id);
    if (!("error" in result)) setDisbandTarget(null);
  }

  const editingId = editing && editing !== "new" ? editing.id : null;
  const sortedSubcontractors = [...subcontractors].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  if (editing) {
    return (
      <Modal
        open={open}
        onClose={close}
        title={editing === "new" ? t("newTeam") : t("editTeam")}
        footer={
          <>
            <ButtonGhost onClick={() => setEditing(null)}>
              {t("cancel")}
            </ButtonGhost>
            <ButtonPrimary
              onClick={() => void handleSave()}
              disabled={creating || updating}
            >
              {t("save")}
            </ButtonPrimary>
          </>
        }
      >
        <p className="mb-3 text-sm text-text-muted">{t("teamMembersHint")}</p>
        <ul className="flex flex-col gap-1" aria-label={t("teamMembers")}>
          {sortedSubcontractors.map((sub) => {
            const inOtherTeam = !!sub.teamId && sub.teamId !== editingId;
            return (
              <li key={sub.id}>
                <label
                  className={`flex items-center gap-3 rounded px-2 py-1.5 text-sm ${
                    inOtherTeam
                      ? "cursor-not-allowed text-text-dim"
                      : "cursor-pointer text-text hover:bg-surface-2"
                  }`}
                >
                  <input
                    type="checkbox"
                    className={CHECKBOX}
                    checked={memberIds.includes(sub.id)}
                    disabled={inOtherTeam}
                    onChange={() => toggleMember(sub.id)}
                  />
                  <span className="flex-1">{sub.name}</span>
                  {inOtherTeam && (
                    <span className="text-label">{t("inAnotherTeam")}</span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={t("teams")}
      footer={
        <ButtonPrimary onClick={() => openForm("new")}>
          + {t("newTeam")}
        </ButtonPrimary>
      }
    >
      {teams.length === 0 ? (
        <EmptyState
          icon={<Icon name="subcontractors" size={22} />}
          title={t("noTeamsYet")}
          description={t("noTeamsHint")}
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {teams.map((team) => (
            <li key={team.id} className="py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-text">
                  {teamLabel(team.members)}
                </span>
                <div className="flex items-center gap-2">
                  <ButtonIcon
                    onClick={() => openForm(team)}
                    title={t("editTeam")}
                  >
                    <Icon name="edit" size={15} />
                  </ButtonIcon>
                  <ButtonIcon
                    onClick={() => setDisbandTarget(team.id)}
                    title={t("disbandTeam")}
                    className="hover:text-danger hover:border-danger"
                  >
                    <Icon name="trash" size={15} />
                  </ButtonIcon>
                </div>
              </div>
              {disbandTarget === team.id && (
                <div className="mt-2 flex items-center justify-between gap-3 rounded border border-border bg-surface-2 px-3 py-2">
                  <p className="text-xs text-text-muted">
                    {t("disbandTeamMessage")}
                  </p>
                  <div className="flex shrink-0 gap-2">
                    <ButtonGhost onClick={() => setDisbandTarget(null)}>
                      {t("cancel")}
                    </ButtonGhost>
                    <ButtonDanger
                      onClick={() => void handleDisband(team.id)}
                      disabled={deleting}
                    >
                      {t("disbandTeam")}
                    </ButtonDanger>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
