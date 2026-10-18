import { useState } from "react";
import { useLang } from "@/contexts/useLang";
import { useFieldCheck } from "@/hooks/useFieldCheck";
import {
  useGetSuppliersQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
  type Supplier,
} from "@/api/endpoints/suppliers";
import { PageHeader } from "@/components/molecules/PageHeader";
import { SearchInput } from "@/components/molecules/SearchInput";
import { FormGroup } from "@/components/molecules/FormGroup";
import { Input } from "@/components/atoms/Input";
import {
  ButtonPrimary,
  ButtonIcon,
  EmptyState,
  Icon,
} from "@/components/atoms";
import { FormModal, ConfirmModal } from "@/components/organisms/Modal";
import { LoadingState } from "@/components/molecules/LoadingState";

export default function SuppliersPage() {
  const { t } = useLang();
  const checkFields = useFieldCheck();
  const { data: suppliers = [], isLoading } = useGetSuppliersQuery();
  const [createSupplier, { isLoading: creating }] = useCreateSupplierMutation();
  const [updateSupplier, { isLoading: updating }] = useUpdateSupplierMutation();
  const [deleteSupplier, { isLoading: deleting }] = useDeleteSupplierMutation();

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [name, setName] = useState("");

  const query = search.trim().toLowerCase();

  const filtered = suppliers.filter(
    (c) => !query || c.name.toLowerCase().includes(query),
  );

  function openAdd() {
    setEditing(null);
    setName("");
    setFormOpen(true);
  }

  function openEdit(corp: Supplier) {
    setEditing(corp);
    setName(corp.name);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setName("");
  }

  async function handleSave() {
    if (!checkFields([[t("name"), !name.trim() && "missing"]])) return;
    const result = editing
      ? await updateSupplier({ id: editing.id, name: name.trim() })
      : await createSupplier({ name: name.trim() });
    if (!("error" in result)) closeForm();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteSupplier(deleteTarget.id);
    if (!("error" in result)) setDeleteTarget(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t("suppliers")}
        subtitle={t("suppliersSubtitle")}
        actions={
          <ButtonPrimary onClick={openAdd}>+ {t("addSupplier")}</ButtonPrimary>
        }
      />

      <SearchInput
        placeholder={t("search")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {isLoading ? (
        <LoadingState label={t("loading")} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Icon name="suppliers" size={22} />}
          title={query ? t("noResults") : t("noSuppliersYet")}
          description={query ? undefined : t("addFirstSupplierHint")}
          action={
            !query ? (
              <ButtonPrimary onClick={openAdd}>
                + {t("addSupplier")}
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
                <th className="text-right py-3 px-4 text-label font-semibold text-text-muted rtl:text-left">
                  {t("actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((corp) => (
                <tr
                  key={corp.id}
                  className="border-b border-border transition-colors last:border-0 hover:bg-surface-2"
                >
                  <td className="py-3 px-4 text-text">{corp.name}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2 rtl:justify-start">
                      <ButtonIcon
                        onClick={() => openEdit(corp)}
                        title={t("edit")}
                      >
                        <Icon name="edit" size={15} />
                      </ButtonIcon>
                      <ButtonIcon
                        onClick={() => setDeleteTarget(corp)}
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
        title={editing ? t("editSupplier") : t("addSupplier")}
        loading={creating || updating}
      >
        <FormGroup>
          <Input
            id="corp-name"
            label={t("name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("supplierNamePlaceholder")}
            required
            autoFocus
          />
        </FormGroup>
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
