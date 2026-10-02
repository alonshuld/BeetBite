import { useState } from "react";
import { useLang } from "@/contexts/useLang";
import { useFieldCheck } from "@/hooks/useFieldCheck";
import {
  useGetSubcontractorsQuery,
  useCreateSubcontractorMutation,
  useUpdateSubcontractorMutation,
  useDeleteSubcontractorMutation,
  type Subcontractor,
} from "@/api/endpoints/subcontractors";
import { PageHeader } from "@/components/molecules/PageHeader";
import { SearchInput } from "@/components/molecules/SearchInput";
import { FormGroup, FormRow } from "@/components/molecules/FormGroup";
import { Input } from "@/components/atoms/Input";
import {
  ButtonPrimary,
  ButtonIcon,
  EmptyState,
  Icon,
} from "@/components/atoms";
import { FormModal, ConfirmModal } from "@/components/organisms/Modal";
import { LoadingState } from "@/components/molecules/LoadingState";

export default function SubcontractorsPage() {
  const { t } = useLang();
  const checkFields = useFieldCheck();
  const { data: subcontractors = [], isLoading } = useGetSubcontractorsQuery();
  const [createSubcontractor, { isLoading: creating }] =
    useCreateSubcontractorMutation();
  const [updateSubcontractor, { isLoading: updating }] =
    useUpdateSubcontractorMutation();
  const [deleteSubcontractor, { isLoading: deleting }] =
    useDeleteSubcontractorMutation();

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Subcontractor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subcontractor | null>(null);
  const [name, setName] = useState("");
  const [companyNumber, setCompanyNumber] = useState("");

  const query = search.trim().toLowerCase();

  const filtered = subcontractors.filter(
    (s) =>
      !query ||
      s.name.toLowerCase().includes(query) ||
      s.companyNumber.toLowerCase().includes(query),
  );

  function openAdd() {
    setEditing(null);
    setName("");
    setCompanyNumber("");
    setFormOpen(true);
  }

  function openEdit(sub: Subcontractor) {
    setEditing(sub);
    setName(sub.name);
    setCompanyNumber(sub.companyNumber);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setName("");
    setCompanyNumber("");
  }

  async function handleSave() {
    if (
      !checkFields([
        [t("name"), !name.trim() && "missing"],
        [
          t("companyNumberLabel"),
          !companyNumber
            ? "missing"
            : !/^\d{9}$/.test(companyNumber) && "invalid",
        ],
      ])
    )
      return;
    const result = editing
      ? await updateSubcontractor({
          id: editing.id,
          name: name.trim(),
          companyNumber,
        })
      : await createSubcontractor({ name: name.trim(), companyNumber });
    if (!("error" in result)) closeForm();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteSubcontractor(deleteTarget.id);
    if (!("error" in result)) setDeleteTarget(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t("subcontractors")}
        subtitle={t("manageSubcontractorsSubtitle")}
        actions={
          <ButtonPrimary onClick={openAdd}>
            + {t("addSubcontractor")}
          </ButtonPrimary>
        }
      />

      <SearchInput
        placeholder={t("search")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />

      {isLoading ? (
        <LoadingState label={t("loading")} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Icon name="wrench" size={22} />}
          title={query ? t("noResults") : t("noSubcontractorsYet")}
          description={query ? undefined : t("addFirstSubcontractorHint")}
          action={
            !query ? (
              <ButtonPrimary onClick={openAdd}>
                + {t("addSubcontractor")}
              </ButtonPrimary>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                <th className="text-left py-3 px-4 text-label font-semibold text-text-muted rtl:text-right">
                  {t("name")}
                </th>
                <th className="text-left py-3 px-4 text-label font-semibold text-text-muted rtl:text-right">
                  {t("companyNumberLabel")}
                </th>
                <th className="text-right py-3 px-4 text-label font-semibold text-text-muted rtl:text-left">
                  {t("actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sub) => (
                <tr
                  key={sub.id}
                  className="border-b border-border transition-colors last:border-0 hover:bg-surface-2"
                >
                  <td className="py-3 px-4 text-text">{sub.name}</td>
                  <td className="py-3 px-4 text-text">{sub.companyNumber}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2 rtl:justify-start">
                      <ButtonIcon
                        onClick={() => openEdit(sub)}
                        title={t("edit")}
                      >
                        <Icon name="edit" size={15} />
                      </ButtonIcon>
                      <ButtonIcon
                        onClick={() => setDeleteTarget(sub)}
                        title={t("delete")}
                        className="hover:text-danger hover:border-danger"
                      >
                        <Icon name="trash" size={15} />
                      </ButtonIcon>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FormModal
        open={formOpen}
        onClose={closeForm}
        onSubmit={() => void handleSave()}
        title={editing ? t("editSubcontractor") : t("addSubcontractor")}
        loading={creating || updating}
      >
        <FormRow>
          <FormGroup>
            <Input
              id="sub-name"
              label={t("name")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("subcontractorNamePlaceholder")}
              required
              autoFocus
            />
          </FormGroup>
          <FormGroup>
            <Input
              id="sub-company-number"
              label={t("companyNumberLabel")}
              value={companyNumber}
              onChange={(e) =>
                setCompanyNumber(e.target.value.replace(/\D/g, "").slice(0, 9))
              }
              placeholder={t("companyNumberPlaceholder")}
              inputMode="numeric"
              maxLength={9}
              required
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
