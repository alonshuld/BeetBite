import { useState } from "react";
import { useLang } from "@/contexts/useLang";
import { formatISODate } from "@/utils/formatMonth";
import {
  useGetProjectsQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  type Project,
} from "@/api/endpoints/projects";
import { useGetClientsQuery } from "@/api/endpoints/clients";
import { PageHeader } from "@/components/molecules/PageHeader";
import { FormGroup, FormRow } from "@/components/molecules/FormGroup";
import { Input } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { Textarea } from "@/components/atoms/Textarea";
import { Toggle } from "@/components/atoms/Toggle";
import {
  Badge,
  ButtonPrimary,
  ButtonIcon,
  ButtonGhost,
  EmptyState,
} from "@/components/atoms";
import { FormModal, ConfirmModal } from "@/components/organisms/Modal";

function formatILS(amount: number): string {
  return `₪${amount.toLocaleString("he-IL")}`;
}

function projectStatus(p: Project): "active" | "future" | "closed" {
  if (p.isDone) return "closed";
  if (!p.reports || p.reports.length === 0) return "future";
  return "active";
}

const STATUS_VARIANT: Record<string, "green" | "muted" | "yellow"> = {
  active: "green",
  future: "muted",
  closed: "yellow",
};

interface FilterState {
  active: boolean;
  future: boolean;
  closed: boolean;
}

function FilterToggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded text-xs font-semibold border transition-colors ${
        active
          ? "bg-beet text-white border-beet"
          : "bg-transparent text-text-muted border-border hover:bg-surface-2"
      }`}
    >
      {label}
    </button>
  );
}

interface FormState {
  name: string;
  clientId: string;
  description: string;
  estimatedAmount: string;
  finishDate: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  clientId: "",
  description: "",
  estimatedAmount: "",
  finishDate: "",
};

export default function ProjectsPage() {
  const { t, lang } = useLang();
  const { data: projects = [], isLoading } = useGetProjectsQuery();
  const { data: clients = [] } = useGetClientsQuery();
  const [createProject, { isLoading: creating }] = useCreateProjectMutation();
  const [updateProject, { isLoading: updating }] = useUpdateProjectMutation();
  const [deleteProject, { isLoading: deleting }] = useDeleteProjectMutation();

  const [filters, setFilters] = useState<FilterState>({
    active: true,
    future: false,
    closed: false,
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  function toggleFilter(key: keyof FilterState) {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const filtered = projects.filter((p) => {
    const status = projectStatus(p);
    if (status === "active" && filters.active) return true;
    if (status === "future" && filters.future) return true;
    if (status === "closed" && filters.closed) return true;
    return false;
  });

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(project: Project) {
    setEditing(project);
    setForm({
      name: project.name,
      clientId: project.client?.id ?? "",
      description: project.description ?? "",
      estimatedAmount: String(project.estimatedAmount),
      finishDate: project.finishDate ? project.finishDate.slice(0, 10) : "",
    });
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.name.trim() || !form.estimatedAmount) return;
    const amount = parseFloat(form.estimatedAmount);
    if (isNaN(amount) || amount < 0) return;
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      estimatedAmount: amount,
      finishDate: form.finishDate || undefined,
      clientId: form.clientId || undefined,
    };
    if (editing) {
      await updateProject({ id: editing.id, ...payload });
    } else {
      await createProject(payload);
    }
    closeForm();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteProject(deleteTarget.id);
    setDeleteTarget(null);
  }

  async function handleToggleDone(project: Project) {
    await updateProject({ id: project.id, isDone: !project.isDone });
  }

  function completionPct(p: Project): number {
    if (!p.reports || p.reports.length === 0 || p.estimatedAmount === 0)
      return 0;
    return Math.min(
      100,
      Math.round((p.reports.length / p.estimatedAmount) * 100),
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t("projects")}
        subtitle={t("allConstructionProjects")}
        actions={
          <ButtonPrimary onClick={openAdd}>+ {t("addProject")}</ButtonPrimary>
        }
      />

      <div className="flex items-center gap-2 flex-wrap">
        <FilterToggle
          label={t("active")}
          active={filters.active}
          onClick={() => toggleFilter("active")}
        />
        <FilterToggle
          label={t("future")}
          active={filters.future}
          onClick={() => toggleFilter("future")}
        />
        <FilterToggle
          label={t("closed")}
          active={filters.closed}
          onClick={() => toggleFilter("closed")}
        />
      </div>

      {isLoading ? (
        <p className="text-text-muted text-sm">{t("loading")}</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🏗️"
          title={t("noProjectsMatchFilters")}
          description={t("tryTogglingFilters")}
          action={
            <ButtonGhost onClick={openAdd}>+ {t("addProject")}</ButtonGhost>
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-text-muted rtl:text-right">
                  {t("project")}
                </th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-text-muted rtl:text-right">
                  {t("client")}
                </th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-text-muted rtl:text-right">
                  {t("estimated")}
                </th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-text-muted rtl:text-right">
                  {t("finishDate")}
                </th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-text-muted rtl:text-right">
                  {t("completion")}
                </th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-text-muted rtl:text-right">
                  {t("status")}
                </th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-text-muted rtl:text-right">
                  {t("done")}
                </th>
                <th className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-text-muted rtl:text-left">
                  {t("actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((project) => {
                const status = projectStatus(project);
                const pct = completionPct(project);
                return (
                  <tr
                    key={project.id}
                    className="border-b border-border hover:bg-surface-2 transition-colors"
                  >
                    <td className="py-3 px-4 text-text font-medium">
                      {project.name}
                    </td>
                    <td className="py-3 px-4 text-text-muted">
                      {project.client?.name ?? "—"}
                    </td>
                    <td className="py-3 px-4 text-text">
                      {formatILS(project.estimatedAmount)}
                    </td>
                    <td className="py-3 px-4 text-text-muted">
                      {project.finishDate
                        ? formatISODate(project.finishDate, lang)
                        : "—"}
                    </td>
                    <td className="py-3 px-4 min-w-[100px]">
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] text-text-muted">
                          {pct}%
                        </span>
                        <div className="h-[6px] w-full rounded-full bg-surface-3 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-success transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={STATUS_VARIANT[status]}>
                        {t(status)}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Toggle
                        id={`done-${project.id}`}
                        checked={project.isDone}
                        onChange={() => void handleToggleDone(project)}
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2 rtl:justify-start">
                        <ButtonIcon
                          onClick={() => openEdit(project)}
                          title={t("edit")}
                        >
                          ✏️
                        </ButtonIcon>
                        <ButtonIcon
                          onClick={() => setDeleteTarget(project)}
                          title={t("delete")}
                          className="hover:text-danger hover:border-danger"
                        >
                          🗑️
                        </ButtonIcon>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <FormModal
        open={formOpen}
        onClose={closeForm}
        onSubmit={() => void handleSave()}
        title={editing ? t("editProject") : t("addProject")}
        loading={creating || updating}
        large
      >
        <FormRow>
          <FormGroup>
            <Input
              id="proj-name"
              label={t("name")}
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder={t("projectNamePlaceholder")}
              required
              autoFocus
            />
          </FormGroup>
          <FormGroup>
            <Select
              id="proj-client"
              label={t("clientOptional")}
              value={form.clientId}
              onChange={(e) => setField("clientId", e.target.value)}
            >
              <option value="">{t("noClientOption")}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </FormGroup>
        </FormRow>
        <FormGroup>
          <Textarea
            id="proj-desc"
            label={t("description")}
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            placeholder={t("projectDescriptionPlaceholder")}
            rows={3}
          />
        </FormGroup>
        <FormRow>
          <FormGroup>
            <Input
              id="proj-amount"
              label={t("estimatedAmountLabel")}
              type="number"
              min="0"
              step="1"
              value={form.estimatedAmount}
              onChange={(e) => setField("estimatedAmount", e.target.value)}
              placeholder="0"
              required
            />
          </FormGroup>
          <FormGroup>
            <Input
              id="proj-finish"
              label={t("finishDate")}
              type="date"
              value={form.finishDate}
              onChange={(e) => setField("finishDate", e.target.value)}
            />
          </FormGroup>
        </FormRow>
      </FormModal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        title={`${t("deletePrefix")} "${deleteTarget?.name}"?`}
        message={`${t("permanentlyDelete")} "${deleteTarget?.name}". ${t("cannotBeUndone")}`}
        loading={deleting}
      />
    </div>
  );
}
