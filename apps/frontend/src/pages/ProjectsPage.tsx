import { useState } from "react";
import { useLang } from "@/contexts/useLang";
import { useToast } from "@/contexts/useToast";
import {
  useGetProjectsQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  type Project,
} from "@/api/endpoints/projects";
import { useGetClientsQuery } from "@/api/endpoints/clients";
import { SubcontractorSelect } from "@/components/molecules/SubcontractorSelect";
import { useGetInitiatorsQuery } from "@/api/endpoints/initiators";
import { PageHeader } from "@/components/molecules/PageHeader";
import { LoadingState } from "@/components/molecules/LoadingState";
import { completionBarClass } from "@/utils/completion";
import { SearchInput } from "@/components/molecules/SearchInput";
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
  Icon,
} from "@/components/atoms";
import { FormModal, ConfirmModal } from "@/components/organisms/Modal";
import { ProjectTransferModal } from "@/components/organisms/ProjectTransferModal";

function formatILS(amount: number): string {
  return `₪${amount.toLocaleString("he-IL")}`;
}

function projectStatus(p: Project): "active" | "future" | "closed" {
  if (p.isDone) return "closed";
  if (!p.hasReports) return "future";
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
      aria-pressed={active}
      className={`h-9 rounded border px-3 text-label font-semibold transition-colors duration-150 ${
        active
          ? "border-beet bg-beet text-white"
          : "border-border bg-surface text-text-muted hover:border-border-strong hover:bg-surface-2 hover:text-text"
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
  requesterName: string;
  location: string;
  // Optional link to an initiator (יזם). Empty string means none.
  initiatorId: string;
  // Optional opening balance. Empty strings mean "not filled in", which
  // is the normal case; the whole section is skipped unless an amount is typed.
  openingAmount: string;
  openingMonth: string;
  openingSubcontractorId: string;
  openingProfitMargin: string;
}

function currentYearMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

const EMPTY_FORM: FormState = {
  name: "",
  clientId: "",
  description: "",
  estimatedAmount: "",
  requesterName: "",
  location: "",
  initiatorId: "",
  openingAmount: "",
  openingMonth: "",
  openingSubcontractorId: "",
  openingProfitMargin: "",
};

export default function ProjectsPage() {
  const { t } = useLang();
  const { toast } = useToast();
  const { data: projects = [], isLoading } = useGetProjectsQuery();
  const { data: clients = [] } = useGetClientsQuery();
  const { data: initiators = [] } = useGetInitiatorsQuery();
  const [createProject, { isLoading: creating }] = useCreateProjectMutation();
  const [updateProject, { isLoading: updating }] = useUpdateProjectMutation();
  const [deleteProject, { isLoading: deleting }] = useDeleteProjectMutation();

  const [filters, setFilters] = useState<FilterState>({
    active: true,
    future: false,
    closed: false,
  });
  const [progressSort, setProgressSort] = useState<"none" | "asc" | "desc">(
    "none",
  );
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [transferTarget, setTransferTarget] = useState<Project | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  // The opening balance is for importing pre-BeetBite data, so it stays
  // collapsed until asked for.
  const [openingOpen, setOpeningOpen] = useState(false);
  // Set by a save blocked on missing required fields, so they show as invalid
  // only after the user has tried to save — not while they are still typing.
  const [showInvalid, setShowInvalid] = useState(false);

  function toggleFilter(key: keyof FilterState) {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const query = search.trim().toLowerCase();

  const filtered = projects
    .filter((p) => {
      const status = projectStatus(p);
      if (status === "active" && filters.active) return true;
      if (status === "future" && filters.future) return true;
      if (status === "closed" && filters.closed) return true;
      return false;
    })
    .filter(
      (p) =>
        !query ||
        p.name.toLowerCase().includes(query) ||
        p.client.name.toLowerCase().includes(query),
    )
    .slice()
    .sort((a, b) => {
      if (progressSort === "none") return 0;
      const pctA = completionPct(a);
      const pctB = completionPct(b);
      return progressSort === "asc" ? pctA - pctB : pctB - pctA;
    });

  function cycleProgressSort() {
    setProgressSort((prev) =>
      prev === "none" ? "asc" : prev === "asc" ? "desc" : "none",
    );
  }

  function openAdd() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, openingMonth: currentYearMonth() });
    setOpeningOpen(false);
    setShowInvalid(false);
    setFormOpen(true);
  }

  function openEdit(project: Project) {
    setEditing(project);
    setForm({
      ...EMPTY_FORM,
      name: project.name,
      clientId: project.client.id,
      description: project.description ?? "",
      estimatedAmount: String(project.estimatedAmount),
      requesterName: project.requesterName,
      location: project.location,
      initiatorId: project.initiatorId ?? "",
    });
    setShowInvalid(false);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setOpeningOpen(false);
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // The opening balance needs all four fields or none: ProjectReport requires
  // a subcontractor and a profit margin, so a half-filled section cannot be
  // turned into a report at all.
  const openingAmount = parseFloat(form.openingAmount);
  const openingBalanceStarted = form.openingAmount.trim() !== "";
  const openingBalanceComplete =
    openingBalanceStarted &&
    !isNaN(openingAmount) &&
    openingAmount > 0 &&
    form.openingMonth !== "" &&
    form.openingSubcontractorId !== "" &&
    form.openingProfitMargin.trim() !== "";

  const amount = parseFloat(form.estimatedAmount);
  // Required fields left blank. Projects created before requester and
  // location existed have both stored empty, so editing one surfaces here.
  const invalid = {
    name: !form.name.trim(),
    clientId: !form.clientId,
    requesterName: !form.requesterName.trim(),
    location: !form.location.trim(),
    description: !form.description.trim(),
    estimatedAmount: isNaN(amount) || amount <= 0,
  };
  const invalidLabels: Record<keyof typeof invalid, string> = {
    name: t("name"),
    clientId: t("client"),
    requesterName: t("requester"),
    location: t("location"),
    description: t("description"),
    estimatedAmount: t("estimatedAmountLabel"),
  };

  function invalidProps(field: keyof typeof invalid) {
    return showInvalid && invalid[field]
      ? { "aria-invalid": true, className: "!border-danger" }
      : {};
  }

  async function handleSave() {
    const missing = (Object.keys(invalid) as (keyof typeof invalid)[]).filter(
      (field) => invalid[field],
    );
    if (missing.length > 0) {
      // Never refuse silently: say which fields are holding the save up.
      setShowInvalid(true);
      toast(
        `${t("requiredFieldsMissing")} ${missing.map((f) => invalidLabels[f]).join(", ")}`,
        "error",
      );
      return;
    }
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      estimatedAmount: amount,
      clientId: form.clientId,
      requesterName: form.requesterName.trim(),
      location: form.location.trim(),
      initiatorId: form.initiatorId || null,
    };

    if (editing) {
      const result = await updateProject({ id: editing.id, ...payload });
      if (!("error" in result)) closeForm();
      return;
    }

    if (openingBalanceStarted && !openingBalanceComplete) {
      // The warning lives inside the section; make sure it is on screen.
      setOpeningOpen(true);
      return;
    }

    const result = await createProject({
      ...payload,
      ...(openingBalanceComplete
        ? {
            openingBalance: {
              amount: openingAmount,
              month: `${form.openingMonth}-01`,
              subcontractorId: form.openingSubcontractorId,
              profitMargin: parseFloat(form.openingProfitMargin),
            },
          }
        : {}),
    });
    if (!("error" in result)) closeForm();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteProject(deleteTarget.id);
    if (!("error" in result)) setDeleteTarget(null);
  }

  async function handleToggleDone(project: Project) {
    await updateProject({
      id: project.id,
      name: project.name,
      description: project.description,
      estimatedAmount: project.estimatedAmount,
      clientId: project.clientId,
      requesterName: project.requesterName,
      location: project.location,
      isDone: !project.isDone,
    });
  }

  function completionPct(p: Project): number {
    if (!p.paymentProgress || p.estimatedAmount === 0) return 0;
    return Math.min(
      100,
      Math.round((p.paymentProgress.totalPaid / p.estimatedAmount) * 100),
    );
  }

  const totalRemaining = projects.reduce(
    (sum, p) =>
      sum +
      Math.max(0, p.estimatedAmount - (p.paymentProgress?.totalPaid ?? 0)),
    0,
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t("projects")}
        subtitle={t("allConstructionProjects")}
        actions={
          <ButtonPrimary onClick={openAdd}>+ {t("addProject")}</ButtonPrimary>
        }
      />

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            placeholder={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <div className="flex items-center gap-1.5">
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
        </div>
        <div className="tnum flex flex-col gap-0.5 text-end">
          <span className="text-label text-text-muted">
            {t("totalRemaining")}
          </span>
          <span className="text-title font-semibold leading-none text-text">
            {formatILS(totalRemaining)}
          </span>
        </div>
      </div>

      {isLoading ? (
        <LoadingState label={t("loading")} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Icon name="projects" size={22} />}
          title={query ? t("noResults") : t("noProjectsMatchFilters")}
          description={query ? undefined : t("tryTogglingFilters")}
          action={
            query ? undefined : (
              <ButtonGhost onClick={openAdd}>+ {t("addProject")}</ButtonGhost>
            )
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                <th className="text-left py-3 px-4 text-label font-semibold text-text-muted rtl:text-right">
                  {t("project")}
                </th>
                <th className="text-left py-3 px-4 text-label font-semibold text-text-muted rtl:text-right">
                  {t("client")}
                </th>
                <th className="text-left py-3 px-4 text-label font-semibold text-text-muted rtl:text-right">
                  {t("requester")}
                </th>
                <th className="text-left py-3 px-4 text-label font-semibold text-text-muted rtl:text-right">
                  {t("estimated")}
                </th>
                <th className="text-left py-3 px-4 text-label font-semibold text-text-muted rtl:text-right">
                  {t("remaining")}
                </th>
                <th className="text-left py-3 px-4 text-label font-semibold text-text-muted rtl:text-right">
                  <div className="flex items-center gap-1.5">
                    {t("completion")}
                    <button
                      onClick={cycleProgressSort}
                      title={
                        progressSort === "none"
                          ? t("sortByProgressAsc")
                          : progressSort === "asc"
                            ? t("sortByProgressDesc")
                            : t("sortByProgressNone")
                      }
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-sm border transition-colors ${
                        progressSort !== "none"
                          ? "border-beet bg-beet text-white"
                          : "border-border bg-transparent text-text-dim hover:bg-surface-2 hover:text-text"
                      }`}
                    >
                      <Icon
                        name={
                          progressSort === "asc"
                            ? "arrowUp"
                            : progressSort === "desc"
                              ? "arrowDown"
                              : "sortable"
                        }
                        size={13}
                      />
                    </button>
                  </div>
                </th>
                <th className="text-left py-3 px-4 text-label font-semibold text-text-muted rtl:text-right">
                  {t("status")}
                </th>
                <th className="text-left py-3 px-4 text-label font-semibold text-text-muted rtl:text-right">
                  {t("done")}
                </th>
                <th className="text-right py-3 px-4 text-label font-semibold text-text-muted rtl:text-left">
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
                    className="border-b border-border transition-colors last:border-0 hover:bg-surface-2"
                  >
                    <td className="py-3 px-4 text-text font-medium">
                      {project.name}
                    </td>
                    <td className="py-3 px-4 text-text-muted">
                      {project.client.name}
                    </td>
                    <td className="py-3 px-4 text-text-muted">
                      {project.requesterName}
                    </td>
                    <td className="py-3 px-4 text-text">
                      {formatILS(project.estimatedAmount)}
                    </td>
                    <td className="py-3 px-4 text-text">
                      {formatILS(
                        Math.max(
                          0,
                          project.estimatedAmount -
                            (project.paymentProgress?.totalPaid ?? 0),
                        ),
                      )}
                    </td>
                    <td className="py-3 px-4 min-w-[100px]">
                      <div className="flex flex-col gap-1">
                        <span className="tnum text-label font-semibold text-text-muted">
                          {pct}%
                        </span>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
                          <div
                            className={`h-full rounded-full transition-all ${completionBarClass(pct)}`}
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
                          <Icon name="edit" size={15} />
                        </ButtonIcon>
                        <ButtonIcon
                          onClick={() => setTransferTarget(project)}
                          title={t("transferProject")}
                        >
                          <Icon name="transfer" size={15} />
                        </ButtonIcon>
                        <ButtonIcon
                          onClick={() => setDeleteTarget(project)}
                          title={t("delete")}
                          className="hover:text-danger hover:border-danger"
                        >
                          <Icon name="trash" size={15} />
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
              {...invalidProps("name")}
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
              {...invalidProps("clientId")}
              label={t("client")}
              value={form.clientId}
              onChange={(e) => setField("clientId", e.target.value)}
              required
            >
              <option value="" disabled>
                {t("selectClientPlaceholder")}
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </FormGroup>
        </FormRow>
        <FormRow>
          <FormGroup>
            <Input
              id="proj-requester"
              {...invalidProps("requesterName")}
              label={t("requester")}
              value={form.requesterName}
              onChange={(e) => setField("requesterName", e.target.value)}
              placeholder={t("requesterPlaceholder")}
              required
              list="requester-name-options"
            />
            <datalist id="requester-name-options">
              {Array.from(new Set(projects.map((p) => p.requesterName)))
                .filter(Boolean)
                .map((name) => (
                  <option key={name} value={name} />
                ))}
            </datalist>
          </FormGroup>
          <FormGroup>
            <Input
              id="proj-location"
              {...invalidProps("location")}
              label={t("location")}
              value={form.location}
              onChange={(e) => setField("location", e.target.value)}
              placeholder={t("projectLocationPlaceholder")}
              required
            />
          </FormGroup>
        </FormRow>
        <FormGroup>
          <Select
            id="proj-initiator"
            label={t("initiator")}
            value={form.initiatorId}
            onChange={(e) => setField("initiatorId", e.target.value)}
          >
            <option value="">{t("noInitiatorOption")}</option>
            {initiators.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </Select>
        </FormGroup>
        <FormGroup>
          <Textarea
            id="proj-desc"
            {...invalidProps("description")}
            label={t("description")}
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            placeholder={t("projectDescriptionPlaceholder")}
            rows={3}
            required
          />
        </FormGroup>
        <FormRow>
          <FormGroup>
            <Input
              id="proj-amount"
              {...invalidProps("estimatedAmount")}
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
        </FormRow>

        {/* Projects are often entered part-way through the work, so let the
            user record what has already come in. Collapsed because it only
            serves migrating old data; once a contractor is fully on BeetBite
            they create monthly reports instead. Creation only: there is
            nothing to back-date once the project has reports of its own. */}
        {!editing && (
          <div className="flex flex-col gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => setOpeningOpen((o) => !o)}
              aria-expanded={openingOpen}
              className="flex items-center justify-between gap-2 text-start"
            >
              <span className="text-label font-semibold text-text-muted">
                {t("openingBalanceTitle")}
              </span>
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`h-4 w-4 shrink-0 text-text-muted transition-transform ${
                  openingOpen ? "rotate-180" : ""
                }`}
              >
                <path d="M5 8l5 5 5-5" />
              </svg>
            </button>
            {openingOpen && (
              <>
                <p className="text-xs text-text-muted -mt-1">
                  {t("openingBalanceHint")}
                </p>
                <FormRow>
                  <FormGroup>
                    <Input
                      id="proj-opening-amount"
                      label={t("openingBalanceAmount")}
                      type="number"
                      min="0"
                      step="1"
                      value={form.openingAmount}
                      onChange={(e) =>
                        setField("openingAmount", e.target.value)
                      }
                      placeholder="0"
                    />
                  </FormGroup>
                  <FormGroup>
                    <Input
                      id="proj-opening-month"
                      label={t("openingBalanceMonth")}
                      type="month"
                      value={form.openingMonth}
                      onChange={(e) => setField("openingMonth", e.target.value)}
                    />
                  </FormGroup>
                </FormRow>
                <FormRow>
                  <FormGroup>
                    <SubcontractorSelect
                      id="proj-opening-subcontractor"
                      label={t("subcontractor")}
                      value={form.openingSubcontractorId}
                      onChange={(id) => setField("openingSubcontractorId", id)}
                      emptyLabel={t("chooseSubcontractor")}
                    />
                  </FormGroup>
                  <FormGroup>
                    <Input
                      id="proj-opening-margin"
                      label={t("profitMargin")}
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={form.openingProfitMargin}
                      onChange={(e) =>
                        setField("openingProfitMargin", e.target.value)
                      }
                      placeholder="0"
                    />
                  </FormGroup>
                </FormRow>
                {openingBalanceStarted && !openingBalanceComplete && (
                  <p className="text-xs text-warning" role="alert">
                    {t("openingBalanceIncomplete")}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </FormModal>

      <ProjectTransferModal
        project={transferTarget}
        onClose={() => setTransferTarget(null)}
      />

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
