import { fieldLabel } from "@/components/atoms/field";
import { useState } from "react";
import { PageHeader } from "@/components/molecules/PageHeader";
import { MonthPicker } from "@/components/molecules/MonthPicker";
import { Input, ButtonPrimary } from "@/components/atoms";
import { useLang } from "@/contexts/useLang";
import { useFieldCheck } from "@/hooks/useFieldCheck";
import { useToast } from "@/contexts/useToast";
import { formatYM } from "@/utils/formatMonth";
import {
  useGetVatRateHistoryQuery,
  useGetResolvedVatRateQuery,
  useUpsertVatRateMutation,
} from "@/api/endpoints/vatRates";
import { LoadingState } from "@/components/molecules/LoadingState";

function currentYM(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function SettingsVatPage() {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const checkFields = useFieldCheck();
  const { data: history = [], isLoading } = useGetVatRateHistoryQuery();
  const { data: resolved } = useGetResolvedVatRateQuery(currentYM());
  const [upsertVatRate, { isLoading: saving }] = useUpsertVatRateMutation();

  const [month, setMonth] = useState(currentYM());
  const [percentage, setPercentage] = useState("");

  async function handleSave() {
    const value = Number(percentage);
    if (
      !checkFields([
        [
          t("vatPercentLabel"),
          !percentage
            ? "missing"
            : (Number.isNaN(value) || value < 0 || value > 100) && "invalid",
        ],
      ])
    )
      return;

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

      <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="rounded-lg border border-border bg-surface p-6 shadow-(--shadow-card) flex flex-col justify-center gap-1">
          <span className="text-sm font-semibold text-text-muted">
            {t("currentVatRate")}
          </span>
          <span className="tnum text-hero font-extrabold text-text">
            {resolved?.percentage != null
              ? `${resolved.percentage}%`
              : t("notConfigured")}
          </span>
        </div>

        <div className="rounded-lg border border-border bg-surface p-6 shadow-(--shadow-card) flex flex-col gap-4">
          <h3 className="text-base font-bold text-text">{t("setVatRate")}</h3>
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex flex-col gap-1.5">
              <span className={fieldLabel}>{t("effectiveFrom")}</span>
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
              className="h-9 w-32"
            />
            <ButtonPrimary
              disabled={saving || !percentage}
              onClick={() => void handleSave()}
            >
              {t("save")}
            </ButtonPrimary>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-6 shadow-(--shadow-card) md:col-span-2">
          <h3 className="mb-3 text-base font-bold text-text">
            {t("vatRateHistory")}
          </h3>
          {isLoading ? (
            <LoadingState label={t("loading")} />
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
                    <td className="py-2.5 text-text-muted">
                      {formatYM(entry.effectiveMonth.slice(0, 7), lang)}
                    </td>
                    <td className="py-2.5 text-end font-semibold text-text">
                      {entry.percentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
