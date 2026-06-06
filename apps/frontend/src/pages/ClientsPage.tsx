import { useState } from "react";
import { useLang } from "@/contexts/useLang";
import {
  useGetClientsQuery,
  useCreateClientMutation,
  useUpdateClientMutation,
  useDeleteClientMutation,
  type Client,
} from "@/api/endpoints/clients";
import { PageHeader } from "@/components/molecules/PageHeader";
import { SearchInput } from "@/components/molecules/SearchInput";
import { FormGroup } from "@/components/molecules/FormGroup";
import { Input } from "@/components/atoms/Input";
import { ButtonPrimary, ButtonIcon, EmptyState } from "@/components/atoms";
import { FormModal, ConfirmModal } from "@/components/organisms/Modal";

export default function ClientsPage() {
  const { t } = useLang();
  const { data: clients = [], isLoading } = useGetClientsQuery();
  const [createClient, { isLoading: creating }] = useCreateClientMutation();
  const [updateClient, { isLoading: updating }] = useUpdateClientMutation();
  const [deleteClient, { isLoading: deleting }] = useDeleteClientMutation();

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [name, setName] = useState("");

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  function openAdd() {
    setEditing(null);
    setName("");
    setFormOpen(true);
  }

  function openEdit(client: Client) {
    setEditing(client);
    setName(client.name);
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
      ? await updateClient({ id: editing.id, name: name.trim() })
      : await createClient({ name: name.trim() });
    if (!('error' in result)) closeForm();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteClient(deleteTarget.id);
    if (!('error' in result)) setDeleteTarget(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t("clients")}
        subtitle={t("manageClientsSubtitle")}
        actions={
          <ButtonPrimary onClick={openAdd}>+ {t("addClient")}</ButtonPrimary>
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
          icon="👤"
          title={search ? t("noResults") : t("noClientsYet")}
          description={search ? undefined : t("addFirstClientHint")}
          action={
            !search ? (
              <ButtonPrimary onClick={openAdd}>
                + {t("addClient")}
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
              {filtered.map((client) => (
                <tr
                  key={client.id}
                  className="border-b border-border hover:bg-surface-2 transition-colors"
                >
                  <td className="py-3 px-4 text-text">{client.name}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2 rtl:justify-start">
                      <ButtonIcon
                        onClick={() => openEdit(client)}
                        title={t("edit")}
                      >
                        ✏️
                      </ButtonIcon>
                      <ButtonIcon
                        onClick={() => setDeleteTarget(client)}
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
        title={editing ? t("editClient") : t("addClient")}
        loading={creating || updating}
      >
        <FormGroup>
          <Input
            id="client-name"
            label={t("name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("clientNamePlaceholder")}
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
        message={`${t("permanentlyDelete")} "${deleteTarget?.name}". ${t("clientDeleteCascadeWarning")} ${t("cannotBeUndone")}`}
        loading={deleting}
      />
    </div>
  );
}
