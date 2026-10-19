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
import {
  DEFAULT_PDF_COLORS,
  DEFAULT_PDF_FONT,
} from "@/components/organisms/companySettingsDefaults";
import { LoadingState } from "@/components/molecules/LoadingState";

const BLANK_VALUE: CompanySettingsFormValue = {
  name: "",
  description: "",
  companyNumber: "",
  phone: "",
  email: "",
  addressStreet: "",
  addressCity: "",
  logo: null,
  signature: null,
  ...DEFAULT_PDF_COLORS,
  pdfFont: DEFAULT_PDF_FONT,
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
      phone: data.phone ?? "",
      email: data.email ?? "",
      addressStreet: data.addressStreet ?? "",
      addressCity: data.addressCity ?? "",
      logo: data.logo,
      signature: data.signature,
      pdfPrimaryColor: data.pdfPrimaryColor,
      pdfSecondaryColor: data.pdfSecondaryColor,
      pdfFont: data.pdfFont,
    });
  }

  async function handleSave() {
    await upsertCompanySettings({
      name: value.name.trim() || null,
      description: value.description.trim() || null,
      companyNumber: value.companyNumber || null,
      phone: value.phone.trim() || null,
      email: value.email.trim() || null,
      addressStreet: value.addressStreet.trim() || null,
      addressCity: value.addressCity.trim() || null,
      logo: value.logo,
      signature: value.signature,
      pdfPrimaryColor: value.pdfPrimaryColor,
      pdfSecondaryColor: value.pdfSecondaryColor,
      pdfFont: value.pdfFont,
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t("companySettings")}
        subtitle={t("companySettingsSubtitle")}
      />

      {isLoading ? (
        <LoadingState label={t("loading")} />
      ) : (
        <div className="rounded-lg border border-border bg-surface px-8 pt-6 shadow-(--shadow-card) max-[768px]:px-5">
          <CompanySettingsForm value={value} onChange={setValue} />

          <div className="-mx-8 flex items-center justify-end border-t border-border px-8 py-4 max-[768px]:-mx-5 max-[768px]:px-5">
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
