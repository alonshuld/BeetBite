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

function formatILS(amount: number): string {
  return `₪${amount.toLocaleString("he-IL")}`;
}

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
  const [agreedAmount, setAgreedAmount] = useState("");

  const filtered = subcontractors.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  function openAdd() {
    setEditing(null);
    setName("");
    setAgreedAmount("");
    setFormOpen(true);
  }

  function openEdit(sub: Subcontractor) {
    setEditing(sub);
    setName(sub.name);
    setAgreedAmount(String(sub.agreedAmount));
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setName("");
    setAgreedAmount("");
  }

  async function handleSave() {
    if (!name.trim() || !agreedAmount) return;
    const amount = parseFloat(agreedAmount);
    if (isNaN(amount) || amount < 0) return;
    if (editing) {
      await updateSubcontractor({
        id: editing.id,
        name: name.trim(),
        agreedAmount: amount,
      });
    } else {
      await createSubcontractor({ name: name.trim(), agreedAmount: amount });
    }
    closeForm();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteSubcontractor(deleteTarget.id);
    setDeleteTarget(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t("subcontractors")}
        subtitle="Manage subcontractor records"
        actions={
          <ButtonPrimary onClick={openAdd}>
            + {t("add")} Subcontractor
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
        <p className="text-text-muted text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🔧"
          title={search ? t("noResults") : "No subcontractors yet"}
          description={
            search ? undefined : "Add your first subcontractor to get started"
          }
          action={
            !search ? (
              <ButtonPrimary onClick={openAdd}>
                + {t("add")} Subcontractor
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
                  Name
                </th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-text-muted rtl:text-right">
                  Agreed Amount
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
                  <td className="py-3 px-4 text-text font-medium">
                    {formatILS(sub.agreedAmount)}
                  </td>
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
        title={editing ? "Edit Subcontractor" : "Add Subcontractor"}
        loading={creating || updating}
      >
        <FormRow>
          <FormGroup>
            <Input
              id="sub-name"
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Subcontractor name"
              required
              autoFocus
            />
          </FormGroup>
          <FormGroup>
            <Input
              id="sub-agreed-amount"
              label="Agreed Amount (₪)"
              type="number"
              min="0"
              step="1"
              value={agreedAmount}
              onChange={(e) => setAgreedAmount(e.target.value)}
              placeholder="0"
              required
            />
          </FormGroup>
        </FormRow>
      </FormModal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        title={`Delete "${deleteTarget?.name}"?`}
        message={`This will permanently delete "${deleteTarget?.name}". This action cannot be undone.`}
        loading={deleting}
      />
    </div>
  );
}
