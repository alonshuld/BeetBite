import { useState } from "react";
import { PageHeader } from "@/components/molecules/PageHeader";
import { MonthPicker } from "@/components/molecules/MonthPicker";
import { Input, ButtonPrimary } from "@/components/atoms";
import { useLang } from "@/contexts/useLang";
import { useToast } from "@/contexts/useToast";
import { formatYM } from "@/utils/formatMonth";
import {
  useGetVatRateHistoryQuery,
  useGetResolvedVatRateQuery,
  useUpsertVatRateMutation,
} from "@/api/endpoints/vatRates";

function currentYM(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function SettingsVatPage() {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const { data: history = [], isLoading } = useGetVatRateHistoryQuery();
  const { data: resolved } = useGetResolvedVatRateQuery(currentYM());
  const [upsertVatRate, { isLoading: saving }] = useUpsertVatRateMutation();

  const [month, setMonth] = useState(currentYM());
  const [percentage, setPercentage] = useState("");

  async function handleSave() {
    const value = Number(percentage);
    if (!percentage || Number.isNaN(value) || value < 0 || value > 100) return;

    const result = await upsertVatRate({
      month: month + "-01",
      percentage: value,
    });
    if (!("error" in result)) {
      toast(t("vatRateSaved"), "success");
      setPercentage("");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t("vatRate")} subtitle={t("vatRateSubtitle")} />

      <div className="bg-surface rounded p-5 max-w-[480px] flex flex-col gap-1">
        <span className="text-[12px] font-medium uppercase tracking-wide text-text-muted">
          {t("currentVatRate")}
        </span>
        <span className="text-2xl font-semibold text-text">
          {resolved?.percentage != null
            ? `${resolved.percentage}%`
            : t("notConfigured")}
        </span>
      </div>

      <div className="bg-surface rounded p-5 max-w-[480px] flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide">
          {t("setVatRate")}
        </h3>
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex flex-col gap-1">
            <span className="text-[12px] font-medium uppercase tracking-wide text-text-muted">
              {t("effectiveFrom")}
            </span>
            <MonthPicker value={month} onChange={setMonth} />
          </div>
          <Input
            label={t("vatPercentLabel")}
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={percentage}
            onChange={(e) => setPercentage(e.target.value)}
            className="w-32"
          />
          <ButtonPrimary
            disabled={saving || !percentage}
            onClick={() => void handleSave()}
          >
            {t("save")}
          </ButtonPrimary>
        </div>
      </div>

      <div className="bg-surface rounded p-5 max-w-[480px]">
        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">
          {t("vatRateHistory")}
        </h3>
        {isLoading ? (
          <p className="text-text-muted text-sm">{t("loading")}</p>
        ) : history.length === 0 ? (
          <p className="text-text-muted text-sm">{t("noData")}</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {history.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="py-2 text-text-muted">
                    {formatYM(entry.effectiveMonth.slice(0, 7), lang)}
                  </td>
                  <td className="py-2 text-right rtl:text-left font-medium text-text">
                    {entry.percentage}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
