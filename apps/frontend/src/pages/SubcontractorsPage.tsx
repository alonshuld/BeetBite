import { useState } from "react";
import { useLang } from "@/contexts/useLang";
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
import { ButtonPrimary, ButtonIcon, EmptyState } from "@/components/atoms";
import { FormModal, ConfirmModal } from "@/components/organisms/Modal";

export default function SubcontractorsPage() {
  const { t } = useLang();
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

  const filtered = subcontractors.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
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
    if (!name.trim() || !/^\d{9}$/.test(companyNumber)) return;
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
        <p className="text-text-muted text-sm">{t("loading")}</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🔧"
          title={search ? t("noResults") : t("noSubcontractorsYet")}
          description={search ? undefined : t("addFirstSubcontractorHint")}
          action={
            !search ? (
              <ButtonPrimary onClick={openAdd}>
                + {t("addSubcontractor")}
              </ButtonPrimary>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-text-muted rtl:text-right">
                  {t("name")}
                </th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-text-muted rtl:text-right">
                  {t("companyNumberLabel")}
                </th>
                <th className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-text-muted rtl:text-left">
                  {t("actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sub) => (
                <tr
                  key={sub.id}
                  className="border-b border-border hover:bg-surface-2 transition-colors"
                >
                  <td className="py-3 px-4 text-text">{sub.name}</td>
                  <td className="py-3 px-4 text-text">{sub.companyNumber}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2 rtl:justify-start">
                      <ButtonIcon
                        onClick={() => openEdit(sub)}
                        title={t("edit")}
                      >
                        ✏️
                      </ButtonIcon>
                      <ButtonIcon
                        onClick={() => setDeleteTarget(sub)}
                        title={t("delete")}
                        className="hover:text-danger hover:border-danger"
                      >
                        🗑️
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
