import { useOutletContext } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useGetProjectReportsQuery } from "@/api/endpoints/project-reports";
import { PageHeader } from "@/components/molecules/PageHeader";
import { StatCard } from "@/components/molecules/StatCard";
import { EmptyState, LinkButton } from "@/components/atoms";
import { useLang } from "@/contexts/useLang";

function formatILS(n: number): string {
  return `₪${n.toLocaleString("he-IL")}`;
}

function formatMonth(ym: string): string {
  const [y, m] = ym.split("-");
  return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
}

export default function IncomePage() {
  const { month } = useOutletContext<{ month: string }>();
  const navigate = useNavigate();
  const { data: allReports = [], isLoading } = useGetProjectReportsQuery();
  const { t } = useLang();

  const reports = allReports.filter((r) => r.month === month);

  const totalIncome = reports.reduce((sum, r) => sum + r.income, 0);
  const totalProfit = reports.reduce(
    (sum, r) => sum + r.income * (r.profitMarginPercent / 100),
    0,
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t("monthlyIncome")} subtitle={formatMonth(month)} />

      <div className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
        <StatCard label={t("totalIncome")} value={formatILS(totalIncome)} />
        <StatCard
          label={t("totalProfit")}
          value={formatILS(Math.round(totalProfit))}
        />
      </div>

      {isLoading ? (
        <p className="text-text-muted text-sm">{t("loading")}</p>
      ) : reports.length === 0 ? (
        <EmptyState
          icon="💰"
          title={`${t("noProjectReportsFor")} ${formatMonth(month)}`}
          description={t("reportsAppearNote")}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-text-muted rtl:text-right">
                  {t("project")}
                </th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-text-muted rtl:text-right">
                  {t("client")}
                </th>
                <th className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-text-muted rtl:text-left">
                  {t("income")}
                </th>
                <th className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-text-muted rtl:text-left">
                  {t("marginPct")}
                </th>
                <th className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-text-muted rtl:text-left">
                  {t("profit")}
                </th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => {
                const profit =
                  report.income * (report.profitMarginPercent / 100);
                return (
                  <tr
                    key={report.id}
                    className="border-b border-border hover:bg-surface-2 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <LinkButton
                        onClick={() => {
                          void navigate(
                            `/reports/projects/${report.project.id}`,
                          );
                        }}
                      >
                        {report.project.name}
                      </LinkButton>
                    </td>
                    <td className="py-3 px-4 text-text-muted">
                      {report.client?.name ?? "—"}
                    </td>
                    <td className="py-3 px-4 text-right text-text rtl:text-left">
                      {formatILS(report.income)}
                    </td>
                    <td className="py-3 px-4 text-right text-text-muted rtl:text-left">
                      {report.profitMarginPercent}%
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-success rtl:text-left">
                      {formatILS(Math.round(profit))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border">
                <td
                  colSpan={4}
                  className="py-3 px-4 text-right font-semibold text-text rtl:text-left"
                >
                  {t("totalProfit")}
                </td>
                <td className="py-3 px-4 text-right font-bold text-success text-base rtl:text-left">
                  {formatILS(Math.round(totalProfit))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
