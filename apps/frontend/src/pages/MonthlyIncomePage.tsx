import { useOutletContext } from "react-router-dom";
import { useGetMonthlyIncomeQuery } from "@/api/endpoints/income";
import { PageHeader } from "@/components/molecules/PageHeader";
import { EmptyState } from "@/components/atoms";
import { useLang } from "@/contexts/useLang";
import { formatYM } from "@/utils/formatMonth";

function formatILS(n: number): string {
  return `₪${n.toLocaleString("he-IL")}`;
}

export default function MonthlyIncomePage() {
  const { month } = useOutletContext<{ month: string }>();
  const { data: items = [], isLoading } = useGetMonthlyIncomeQuery(month);
  const { t, lang } = useLang();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-text-muted text-sm">
        {t("loading")}
      </div>
    );
  }

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
          {items.map((item) => (
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

              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-2">
                    <th className="text-left py-2 px-3 text-label font-semibold text-text-muted rtl:text-right">
                      {t("project")}
                    </th>
                    <th className="text-right py-2 px-3 text-label font-semibold text-text-muted rtl:text-left">
                      {t("income")}
                    </th>
                    <th className="text-right py-2 px-3 text-label font-semibold text-text-muted rtl:text-left">
                      {t("profit")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {item.projects.map((proj) => (
                    <tr
                      key={proj.projectId}
                      className="border-b border-border last:border-0"
                    >
                      <td className="py-2 px-3 text-text">
                        {proj.projectName}
                      </td>
                      <td className="py-2 px-3 text-right text-success font-medium rtl:text-left">
                        {formatILS(proj.totalIncome)}
                      </td>
                      <td className="py-2 px-3 text-right text-beet-bright font-medium rtl:text-left">
                        {formatILS(proj.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
