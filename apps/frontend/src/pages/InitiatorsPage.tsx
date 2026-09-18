import { useState } from "react";
import { useLang } from "@/contexts/useLang";
import {
  useGetInitiatorsQuery,
  useCreateInitiatorMutation,
  useUpdateInitiatorMutation,
  useDeleteInitiatorMutation,
  type Initiator,
} from "@/api/endpoints/initiators";
import { PageHeader } from "@/components/molecules/PageHeader";
import { SearchInput } from "@/components/molecules/SearchInput";
import { FormGroup } from "@/components/molecules/FormGroup";
import { Input } from "@/components/atoms/Input";
import { ButtonPrimary, ButtonIcon, EmptyState } from "@/components/atoms";
import { FormModal, ConfirmModal } from "@/components/organisms/Modal";

export default function InitiatorsPage() {
  const { t } = useLang();
  const { data: initiators = [], isLoading } = useGetInitiatorsQuery();
  const [createInitiator, { isLoading: creating }] =
    useCreateInitiatorMutation();
  const [updateInitiator, { isLoading: updating }] =
    useUpdateInitiatorMutation();
  const [deleteInitiator, { isLoading: deleting }] =
    useDeleteInitiatorMutation();

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Initiator | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Initiator | null>(null);
  const [name, setName] = useState("");

  const query = search.trim().toLowerCase();

  const filtered = initiators.filter(
    (i) => !query || i.name.toLowerCase().includes(query),
  );

  function openAdd() {
    setEditing(null);
    setName("");
    setFormOpen(true);
  }

  function openEdit(initiator: Initiator) {
    setEditing(initiator);
    setName(initiator.name);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setName("");
  }

  async function handleSave() {
    if (!name.trim()) return;
    const result = editing
      ? await updateInitiator({ id: editing.id, name: name.trim() })
      : await createInitiator({ name: name.trim() });
    if (!("error" in result)) closeForm();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteInitiator(deleteTarget.id);
    if (!("error" in result)) setDeleteTarget(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t("initiators")}
        subtitle={t("initiatorsSubtitle")}
        actions={
          <ButtonPrimary onClick={openAdd}>+ {t("addInitiator")}</ButtonPrimary>
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
          icon="🎯"
          title={query ? t("noResults") : t("noInitiatorsYet")}
          description={query ? undefined : t("addFirstInitiatorHint")}
          action={
            !query ? (
              <ButtonPrimary onClick={openAdd}>
                + {t("addInitiator")}
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
                <th className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-text-muted rtl:text-left">
                  {t("actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((initiator) => (
                <tr
                  key={initiator.id}
                  className="border-b border-border hover:bg-surface-2 transition-colors"
                >
                  <td className="py-3 px-4 text-text">{initiator.name}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2 rtl:justify-start">
                      <ButtonIcon
                        onClick={() => openEdit(initiator)}
                        title={t("edit")}
                      >
                        ✏️
                      </ButtonIcon>
                      <ButtonIcon
                        onClick={() => setDeleteTarget(initiator)}
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
        title={editing ? t("editInitiator") : t("addInitiator")}
        loading={creating || updating}
      >
        <FormGroup>
          <Input
            id="initiator-name"
            label={t("name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("initiatorNamePlaceholder")}
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
