import { useState } from "react";
import { useLang } from "@/contexts/useLang";
import { useFieldCheck } from "@/hooks/useFieldCheck";
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
import {
  ButtonPrimary,
  ButtonIcon,
  EmptyState,
  Icon,
} from "@/components/atoms";
import { FormModal, ConfirmModal } from "@/components/organisms/Modal";
import { LoadingState } from "@/components/molecules/LoadingState";

export default function ClientsPage() {
  const { t } = useLang();
  const checkFields = useFieldCheck();
  const { data: clients = [], isLoading } = useGetClientsQuery();
  const [createClient, { isLoading: creating }] = useCreateClientMutation();
  const [updateClient, { isLoading: updating }] = useUpdateClientMutation();
  const [deleteClient, { isLoading: deleting }] = useDeleteClientMutation();

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [name, setName] = useState("");

  const query = search.trim().toLowerCase();

  const filtered = clients.filter(
    (c) => !query || c.name.toLowerCase().includes(query),
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
    if (!checkFields([[t("name"), !name.trim() && "missing"]])) return;
    const result = editing
      ? await updateClient({ id: editing.id, name: name.trim() })
      : await createClient({ name: name.trim() });
    if (!("error" in result)) closeForm();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteClient(deleteTarget.id);
    if (!("error" in result)) setDeleteTarget(null);
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
      />

      {isLoading ? (
        <LoadingState label={t("loading")} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Icon name="clients" size={22} />}
          title={query ? t("noResults") : t("noClientsYet")}
          description={query ? undefined : t("addFirstClientHint")}
          action={
            !query ? (
              <ButtonPrimary onClick={openAdd}>
                + {t("addClient")}
              </ButtonPrimary>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-(--shadow-card)">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-label font-semibold text-text-muted rtl:text-right">
                  {t("name")}
                </th>
                <th className="text-right py-3 px-4 text-label font-semibold text-text-muted rtl:text-left">
                  {t("actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => (
                <tr
                  key={client.id}
                  className="border-b border-border transition-colors last:border-0 hover:bg-surface-2"
                >
                  <td className="py-3 px-4 text-text">{client.name}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2 rtl:justify-start">
                      <ButtonIcon
                        onClick={() => openEdit(client)}
                        title={t("edit")}
                      >
                        <Icon name="edit" size={15} />
                      </ButtonIcon>
                      <ButtonIcon
                        onClick={() => setDeleteTarget(client)}
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
