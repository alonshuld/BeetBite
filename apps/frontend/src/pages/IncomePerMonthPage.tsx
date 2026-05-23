import { useState } from "react";
import { useGetAllMonthsIncomesQuery } from "@/api/endpoints/incomes";
import { PageHeader } from "@/components/molecules/PageHeader";
import { Badge, EmptyState } from "@/components/atoms";
import { useLang } from "@/contexts/useLang";
import { formatYM } from "@/utils/formatMonth";

function formatILS(n: number): string {
  return `₪${n.toLocaleString("he-IL")}`;
}

type FilterPill = "all" | "unpaid" | "paid";

export default function IncomePerMonthPage() {
  const { data: months = [], isLoading } = useGetAllMonthsIncomesQuery();
  const [filter, setFilter] = useState<FilterPill>("all");
  const { t, lang } = useLang();

  const filteredMonths = months
    .map((m) => ({
      ...m,
      projects: m.projects.filter((p) => {
        if (filter === "paid") return p.incomeStatus === "paid";
        if (filter === "unpaid") return p.incomeStatus === "pending";
        return true;
      }),
    }))
    .filter((m) => m.projects.length > 0)
    .sort((a, b) => b.month.localeCompare(a.month));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t("incomePerMonth")}
        subtitle={t("allProjectsByMonth")}
        actions={
          <div className="flex items-center gap-2">
            {(["all", "unpaid", "paid"] as const).map((pill) => (
              <button
                key={pill}
                onClick={() => setFilter(pill)}
                className={`px-3 py-1.5 rounded text-xs font-semibold border capitalize transition-colors ${
                  filter === pill
                    ? "bg-beet text-white border-beet"
                    : "bg-transparent text-text-muted border-border hover:bg-surface-2"
                }`}
              >
                {t(pill)}
              </button>
            ))}
          </div>
        }
      />

      {isLoading ? (
        <p className="text-text-muted text-sm">{t("loading")}</p>
      ) : filteredMonths.length === 0 ? (
        <EmptyState
          icon="📅"
          title={t("noIncomeRecords")}
          description={
            filter !== "all" ? t("trySwitchingFilter") : t("incomeRecordsNote")
          }
        />
      ) : (
        <div className="flex flex-col gap-8">
          {filteredMonths.map(({ month, projects }) => (
            <div key={month}>
              <h2 className="font-serif text-lg text-text mb-3">
                {formatYM(month, lang, "long")}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wide text-text-muted rtl:text-right">
                        {t("project")}
                      </th>
                      <th className="text-left py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wide text-text-muted rtl:text-right">
                        {t("client")}
                      </th>
                      <th className="text-right py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wide text-text-muted rtl:text-left">
                        {t("income")}
                      </th>
                      <th className="text-left py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wide text-text-muted rtl:text-right">
                        {t("status")}
                      </th>
                      <th className="text-left py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wide text-text-muted rtl:text-right">
                        {t("completion")} %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((entry) => {
                      const isPaid = entry.incomeStatus === "paid";
                      const pct = Math.min(
                        100,
                        Math.round(entry.completionPercent),
                      );
                      return (
                        <tr
                          key={entry.projectId}
                          className="border-b border-border hover:bg-surface-2 transition-colors"
                        >
                          <td className="py-2.5 px-4 text-text font-medium">
                            {entry.projectName}
                          </td>
                          <td className="py-2.5 px-4 text-text-muted">
                            {entry.clientName ?? "—"}
                          </td>
                          <td className="py-2.5 px-4 text-right text-text rtl:text-left">
                            {formatILS(entry.income)}
                          </td>
                          <td className="py-2.5 px-4">
                            <Badge variant={isPaid ? "green" : "yellow"}>
                              {isPaid ? t("received") : t("pending")}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-4 min-w-[120px]">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-[6px] rounded-full bg-surface-3 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-success transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-[11px] text-text-muted shrink-0">
                                {pct}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
