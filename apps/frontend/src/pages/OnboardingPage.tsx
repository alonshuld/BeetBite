import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ButtonPrimary, ButtonGhost } from "@/components/atoms";
import { useLang } from "@/contexts/useLang";
import { useUpsertCompanySettingsMutation } from "@/api/endpoints/companySettings";
import {
  CompanySettingsForm,
  type CompanySettingsFormValue,
} from "@/components/organisms/CompanySettingsForm";

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
};

export default function OnboardingPage() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [upsertCompanySettings, { isLoading }] =
    useUpsertCompanySettingsMutation();

  const [value, setValue] = useState<CompanySettingsFormValue>(BLANK_VALUE);

  async function handleSkip() {
    const result = await upsertCompanySettings({});
    if (!("error" in result)) {
      await navigate("/reports", { replace: true });
    }
  }

  async function handleSave() {
    const result = await upsertCompanySettings({
      name: value.name.trim() || null,
      description: value.description.trim() || null,
      companyNumber: value.companyNumber || null,
      phone: value.phone.trim() || null,
      email: value.email.trim() || null,
      addressStreet: value.addressStreet.trim() || null,
      addressCity: value.addressCity.trim() || null,
      logo: value.logo,
      signature: value.signature,
    });
    if (!("error" in result)) {
      await navigate("/reports", { replace: true });
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-[var(--bg)] px-4 py-10">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 600px 400px at 50% 40%, oklch(52% 0.22 5 / 0.12), transparent)",
        }}
      />

      <div className="relative w-full max-w-[520px] flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-page text-text">{t("onboardingHeading")}</h1>
          <p className="text-[14px] text-text-muted mt-1">
            {t("onboardingSubtitle")}
          </p>
        </div>

        <div className="bg-surface rounded p-7">
          <CompanySettingsForm value={value} onChange={setValue} />

          <div className="flex items-center justify-end gap-3 mt-2">
            <ButtonGhost
              type="button"
              disabled={isLoading}
              onClick={() => void handleSkip()}
            >
              {t("skipForNow")}
            </ButtonGhost>
            <ButtonPrimary
              type="button"
              disabled={isLoading}
              onClick={() => void handleSave()}
            >
              {t("saveAndContinue")}
            </ButtonPrimary>
          </div>
        </div>
      </div>
    </div>
  );
}
