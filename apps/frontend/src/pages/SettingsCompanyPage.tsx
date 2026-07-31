import { useRef, useState } from "react";
import { PageHeader } from "@/components/molecules/PageHeader";
import { ButtonPrimary } from "@/components/atoms";
import { useLang } from "@/contexts/useLang";
import {
  useGetCompanySettingsQuery,
  useUpsertCompanySettingsMutation,
} from "@/api/endpoints/companySettings";
import {
  CompanySettingsForm,
  type CompanySettingsFormValue,
} from "@/components/organisms/CompanySettingsForm";

const BLANK_VALUE: CompanySettingsFormValue = {
  name: "",
  description: "",
  companyNumber: "",
  logo: null,
  signature: null,
};

export default function SettingsCompanyPage() {
  const { t } = useLang();
  const { data, isLoading } = useGetCompanySettingsQuery();
  const [upsertCompanySettings, { isLoading: saving }] =
    useUpsertCompanySettingsMutation();

  const [value, setValue] = useState<CompanySettingsFormValue>(BLANK_VALUE);
  const seededRef = useRef(false);

  if (data && !seededRef.current) {
    seededRef.current = true;
    setValue({
      name: data.name ?? "",
      description: data.description ?? "",
      companyNumber: data.companyNumber ?? "",
      logo: data.logo,
      signature: data.signature,
    });
  }

  async function handleSave() {
    await upsertCompanySettings({
      name: value.name.trim() || null,
      description: value.description.trim() || null,
      companyNumber: value.companyNumber || null,
      logo: value.logo,
      signature: value.signature,
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t("companySettings")}
        subtitle={t("companySettingsSubtitle")}
      />

      {isLoading ? (
        <p className="text-text-muted text-sm">{t("loading")}</p>
      ) : (
        <div className="bg-surface rounded p-7 max-w-[640px]">
          <CompanySettingsForm value={value} onChange={setValue} />

          <div className="flex items-center justify-end mt-2">
            <ButtonPrimary
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
            >
              {t("save")}
            </ButtonPrimary>
          </div>
        </div>
      )}
    </div>
  );
}
