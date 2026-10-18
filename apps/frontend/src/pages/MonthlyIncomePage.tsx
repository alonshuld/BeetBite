import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  useGetMonthlyIncomeQuery,
  type MonthlyIncomeProject,
} from "@/api/endpoints/income";
import {
  useUpdateIncomeEntryMutation,
  type IncomeEntry,
} from "@/api/endpoints/project-reports";
import { PageHeader } from "@/components/molecules/PageHeader";
import { SearchInput } from "@/components/molecules/SearchInput";
import { Badge, EmptyState } from "@/components/atoms";
import { fieldChrome } from "@/components/atoms/field";
import { useLang } from "@/contexts/useLang";
import { formatYM } from "@/utils/formatMonth";
import { formatILS } from "@/utils/formatMoney";

function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

/*
 * Received/pending badge plus the entry's payment date, editable in place.
 * Saves on blur or Enter rather than on every change: a native date input
 * reports a valid date after each typed year digit (0002, 0020, 0202…), so
 * saving on change would write those intermediate years. Clearing the date
 * marks the income pending again.
 */
function IncomeDateCell({
  entry,
  label,
}: {
  entry: IncomeEntry;
  label: string;
}) {
  const { t } = useLang();
  const [updateIncomeEntry, { isLoading }] = useUpdateIncomeEntryMutation();
  const saved = toDateInput(entry.incomeDate);
  const [draft, setDraft] = useState(saved);

  async function commit() {
    if (draft === saved) return;
    try {
      await updateIncomeEntry({
        id: entry.id,
        incomeDate: draft || null,
      }).unwrap();
    } catch {
      // AppShell already toasts the API error; put the saved date back.
      setDraft(saved);
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {entry.incomeDate ? (
        <Badge variant="green">{t("received")}</Badge>
      ) : (
        <Badge variant="yellow">{t("pending")}</Badge>
      )}
      <input
        type="date"
        aria-label={`${t("incomeDate")} – ${label}`}
        value={draft}
        disabled={isLoading}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") void commit();
        }}
        className={`${fieldChrome} tnum px-1.5 py-0.5 text-label`}
      />
    </div>
  );
}

/*
 * A project with several income entries summarises them on its own row and
 * lists each entry beneath; with a single entry the project row carries it.
 */
function ProjectIncomeRows({ proj }: { proj: MonthlyIncomeProject }) {
  const { t } = useLang();
  const entries = proj.incomeEntries;
  const single = entries.length === 1 ? entries[0] : null;

  return (
    <>
      <tr className="border-b border-border last:border-0">
        <td className="py-2 px-3 text-text">{proj.projectName}</td>
        <td className="py-2 px-3 text-end text-success font-medium">
          {formatILS(proj.totalIncome)}
        </td>
        <td className="py-2 px-3">
          {single ? (
            <IncomeDateCell
              key={`${single.id}:${single.incomeDate}`}
              entry={single}
              label={proj.projectName}
            />
          ) : entries.length > 1 ? (
            <div className="flex justify-end">
              {proj.pendingIncome === 0 ? (
                <Badge variant="green">{t("received")}</Badge>
              ) : (
                <Badge variant="yellow">
                  {t("pending")} {formatILS(proj.pendingIncome)}
                </Badge>
              )}
            </div>
          ) : null}
        </td>
        <td className="py-2 px-3 text-end text-beet-bright font-medium">
          {formatILS(proj.profit)}
        </td>
      </tr>
      {entries.length > 1 &&
        entries.map((entry) => {
          const label = entry.tag || t("clientIncome");
          return (
            <tr key={entry.id} className="border-b border-border last:border-0">
              <td className="py-1.5 pe-3 ps-6 text-xs text-text-muted">
                {label}
              </td>
              <td className="py-1.5 px-3 text-end text-text">
                {formatILS(entry.amount)}
              </td>
              <td className="py-1.5 px-3">
                <IncomeDateCell
                  key={`${entry.id}:${entry.incomeDate}`}
                  entry={entry}
                  label={`${proj.projectName} – ${label}`}
                />
              </td>
              <td />
            </tr>
          );
        })}
    </>
  );
}

export default function MonthlyIncomePage() {
  const { month } = useOutletContext<{ month: string }>();
  const { data: items = [], isLoading } = useGetMonthlyIncomeQuery(month);
  const { t, lang } = useLang();
  const [search, setSearch] = useState("");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-text-muted text-sm">
        {t("loading")}
      </div>
    );
  }

  // Clients by name, and each client's projects by name.
  const sortedItems = [...items]
    .sort((a, b) => a.clientName.localeCompare(b.clientName))
    .map((item) => ({
      ...item,
      projects: [...item.projects].sort((a, b) =>
        a.projectName.localeCompare(b.projectName),
      ),
    }));

  // A client whose name matches keeps all its projects; otherwise only the
  // matching projects stay and clients left empty drop. The totals stay
  // those of the whole month and of each whole client.
  const query = search.trim().toLowerCase();
  const visibleItems = query
    ? sortedItems.flatMap((item) => {
        if (item.clientName.toLowerCase().includes(query)) return [item];
        const projects = item.projects.filter((p) =>
          p.projectName.toLowerCase().includes(query),
        );
        return projects.length > 0 ? [{ ...item, projects }] : [];
      })
    : sortedItems;

  const grandTotalIncome = items.reduce((sum, i) => sum + i.totalIncome, 0);
  const grandTotalProfit = items.reduce((sum, i) => sum + i.totalProfit, 0);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t("monthlyIncome")} subtitle={formatYM(month, lang)} />

      {items.length > 0 && (
        <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-border bg-surface p-4">
          <span className="text-lead font-semibold text-text">
            {t("grandTotal")}
          </span>
          <div className="tnum flex items-end gap-5">
            <div className="flex flex-col gap-0.5 text-end">
              <span className="text-label text-text-muted">{t("income")}</span>
              <span className="text-title font-bold leading-none text-success">
                {formatILS(grandTotalIncome)}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 text-end">
              <span className="text-label text-text-muted">{t("profit")}</span>
              <span className="text-title font-bold leading-none text-beet-bright">
                {formatILS(grandTotalProfit)}
              </span>
            </div>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          title={t("noIncomeThisMonth")}
          description={t("reportsAppearNote")}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <SearchInput
            placeholder={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {visibleItems.length === 0 && <EmptyState title={t("noResults")} />}
          {visibleItems.map((item) => (
            <div
              key={item.clientId}
              className="rounded-lg border border-border bg-surface p-4"
            >
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <h2 className="font-serif text-lead text-text">
                  {item.clientName}
                </h2>
                <div className="tnum flex items-end gap-5">
                  <div className="flex flex-col gap-0.5 text-end">
                    <span className="text-label text-text-muted">
                      {t("income")}
                    </span>
                    <span className="font-bold leading-none text-success">
                      {formatILS(item.totalIncome)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 text-end">
                    <span className="text-label text-text-muted">
                      {t("profit")}
                    </span>
                    <span className="font-bold leading-none text-beet-bright">
                      {formatILS(item.totalProfit)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-2">
                      <th className="text-left py-2 px-3 text-label font-semibold text-text-muted rtl:text-right">
                        {t("project")}
                      </th>
                      <th className="text-end py-2 px-3 text-label font-semibold text-text-muted">
                        {t("income")}
                      </th>
                      <th className="text-end py-2 px-3 text-label font-semibold text-text-muted">
                        {t("incomeDate")}
                      </th>
                      <th className="text-end py-2 px-3 text-label font-semibold text-text-muted">
                        {t("profit")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.projects.map((proj) => (
                      <ProjectIncomeRows key={proj.projectId} proj={proj} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
