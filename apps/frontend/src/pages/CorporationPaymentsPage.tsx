import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useGetCorporationPaymentsByMonthQuery } from "@/api/endpoints/corporation-payments";
import { PageHeader } from "@/components/molecules/PageHeader";
import { EmptyState } from "@/components/atoms";
import { useLang } from "@/contexts/useLang";
import { formatYM } from "@/utils/formatMonth";

function formatILS(n: number): string {
  return `₪${n.toLocaleString("he-IL")}`;
}

function useHover() {
  const [hoverId, setHoverId] = useState<string | null>(null);
  return { hoverId, setHoverId };
}

export default function CorporationPaymentsPage() {
  const { month } = useOutletContext<{ month: string }>();
  const { data, isLoading } = useGetCorporationPaymentsByMonthQuery(month);
  const { hoverId, setHoverId } = useHover();
  const { t, lang } = useLang();

  const rows = data?.corporationsPayments ?? [];
  const grandTotal = data?.total ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t("corporationPayments")}
        subtitle={formatYM(month, lang)}
      />

      {isLoading ? (
        <p className="text-text-muted text-sm">{t("loading")}</p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon="🏢"
          title={`${t("noCorporationPaymentsFor")} ${formatYM(month, lang)}`}
          description={t("corporationPaymentsNote")}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-text-muted rtl:text-right">
                  {t("corporation")}
                </th>
                <th className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-text-muted rtl:text-left">
                  {t("numProjects")}
                </th>
                <th className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-text-muted rtl:text-left">
                  {t("totalPaid")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.corporation.id}
                  className="border-b border-border hover:bg-surface-2 transition-colors relative cursor-default"
                  onMouseEnter={() => setHoverId(row.corporation.id)}
                  onMouseLeave={() => setHoverId(null)}
                >
                  <td className="py-3 px-4 text-text font-medium">
                    {row.corporation.name}
                  </td>
                  <td className="py-3 px-4 text-right text-text-muted rtl:text-left">
                    {row.projectPayments.length}
                  </td>
                  <td className="py-3 px-4 text-right rtl:text-left relative">
                    <span className="text-warning font-bold text-[17px]">
                      {formatILS(row.total)}
                    </span>
                    {hoverId === row.corporation.id && (
                      <div className="absolute right-0 top-full mt-1 z-10 bg-surface border border-border rounded shadow-lg min-w-[240px] p-3 text-left rtl:right-auto rtl:left-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-text-dim mb-2">
                          {t("perProjectBreakdown")}
                        </p>
                        {row.projectPayments.map((pp) => (
                          <div
                            key={pp.id}
                            className="flex justify-between gap-4 py-1 border-b border-border last:border-0 text-xs"
                          >
                            <span className="text-text truncate">
                              {pp.projectReport.projectName}
                            </span>
                            <span className="text-warning font-medium shrink-0">
                              {formatILS(pp.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border">
                <td
                  colSpan={2}
                  className="py-3 px-4 text-right font-semibold text-text rtl:text-left"
                >
                  {t("grandTotal")}
                </td>
                <td className="py-3 px-4 text-right rtl:text-left">
                  <span className="text-warning font-bold text-[20px]">
                    {formatILS(grandTotal)}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
