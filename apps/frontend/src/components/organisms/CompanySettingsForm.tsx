import type { ReactNode } from "react";
import { useLang } from "@/contexts/useLang";
import { Input } from "@/components/atoms/Input";
import { Textarea } from "@/components/atoms/Textarea";
import { FormGroup, FormRow } from "@/components/molecules/FormGroup";
import { ImageUploadField } from "@/components/molecules/ImageUploadField";
import { ColorField } from "@/components/molecules/ColorField";
import { FontField } from "@/components/molecules/FontField";
import type { PdfFont } from "@/api/endpoints/companySettings";

export interface CompanySettingsFormValue {
  name: string;
  description: string;
  companyNumber: string;
  phone: string;
  email: string;
  addressStreet: string;
  addressCity: string;
  logo: string | null;
  signature: string | null;
  pdfPrimaryColor: string;
  pdfSecondaryColor: string;
  pdfFont: PdfFont;
}

interface CompanySettingsFormProps {
  value: CompanySettingsFormValue;
  onChange: (value: CompanySettingsFormValue) => void;
}

export function CompanySettingsForm({
  value,
  onChange,
}: CompanySettingsFormProps) {
  const { t } = useLang();

  return (
    <div className="@container flex flex-col">
      <Section title={t("companyDetailsSection")}>
        <FormGroup>
          <Input
            id="company-name"
            label={t("name")}
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            placeholder={t("companyNamePlaceholder")}
          />
        </FormGroup>
        <FormGroup>
          <Textarea
            id="company-description"
            label={t("description")}
            value={value.description}
            onChange={(e) =>
              onChange({ ...value, description: e.target.value })
            }
            placeholder={t("companyDescriptionPlaceholder")}
            rows={3}
          />
        </FormGroup>
        <FormGroup>
          <Input
            id="company-number"
            label={t("companyNumberLabel")}
            value={value.companyNumber}
            onChange={(e) =>
              onChange({
                ...value,
                companyNumber: e.target.value.replace(/\D/g, "").slice(0, 9),
              })
            }
            placeholder={t("companyNumberPlaceholder")}
            inputMode="numeric"
            maxLength={9}
          />
        </FormGroup>
      </Section>
      <Section title={t("contactSection")}>
        <FormRow>
          <FormGroup>
            <Input
              id="company-phone"
              type="tel"
              label={t("phoneLabel")}
              value={value.phone}
              onChange={(e) => onChange({ ...value, phone: e.target.value })}
              placeholder={t("phonePlaceholder")}
            />
          </FormGroup>
          <FormGroup>
            <Input
              id="company-email"
              type="email"
              label={t("emailLabel")}
              value={value.email}
              onChange={(e) => onChange({ ...value, email: e.target.value })}
              placeholder={t("emailPlaceholder")}
            />
          </FormGroup>
        </FormRow>
        <FormRow>
          <FormGroup>
            <Input
              id="company-address-street"
              label={t("addressStreetLabel")}
              value={value.addressStreet}
              onChange={(e) =>
                onChange({ ...value, addressStreet: e.target.value })
              }
              placeholder={t("addressStreetPlaceholder")}
            />
          </FormGroup>
          <FormGroup>
            <Input
              id="company-address-city"
              label={t("addressCityLabel")}
              value={value.addressCity}
              onChange={(e) =>
                onChange({ ...value, addressCity: e.target.value })
              }
              placeholder={t("addressCityPlaceholder")}
            />
          </FormGroup>
        </FormRow>
      </Section>
      <Section title={t("brandingSection")}>
        <FormRow>
          <FormGroup>
            <ImageUploadField
              label={t("logo")}
              value={value.logo}
              onChange={(logo) => onChange({ ...value, logo })}
            />
          </FormGroup>
          <FormGroup>
            <ImageUploadField
              label={t("signature")}
              value={value.signature}
              onChange={(signature) => onChange({ ...value, signature })}
            />
          </FormGroup>
        </FormRow>
      </Section>
      <Section title={t("pdfColors")} hint={t("pdfColorsHint")}>
        <FormRow>
          <FormGroup>
            <ColorField
              id="company-pdf-primary-color"
              label={t("pdfPrimaryColor")}
              value={value.pdfPrimaryColor}
              onChange={(pdfPrimaryColor) =>
                onChange({ ...value, pdfPrimaryColor })
              }
            />
          </FormGroup>
          <FormGroup>
            <ColorField
              id="company-pdf-secondary-color"
              label={t("pdfSecondaryColor")}
              value={value.pdfSecondaryColor}
              onChange={(pdfSecondaryColor) =>
                onChange({ ...value, pdfSecondaryColor })
              }
            />
          </FormGroup>
        </FormRow>
        <FormGroup>
          <FontField
            id="company-pdf-font"
            label={t("pdfFont")}
            value={value.pdfFont}
            onChange={(pdfFont) => onChange({ ...value, pdfFont })}
            previewText={t("pdfFontPreview")}
          />
        </FormGroup>
      </Section>
    </div>
  );
}

/*
 * One block of the form: its name (and a hint) in a narrow column beside the
 * fields when the form is wide, stacked above them when it is not. The form
 * sits in a narrow card on onboarding and a wide one in settings, so it reads
 * its own width (a container query) rather than the viewport's.
 */
function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="grid grid-cols-1 gap-x-10 gap-y-4 border-b border-border py-6 first:pt-1 last:border-b-0 last:pb-2 @3xl:grid-cols-[200px_minmax(0,1fr)]">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-bold text-text">{title}</h2>
        {hint && <p className="text-sm text-text-muted">{hint}</p>}
      </div>
      <div className="flex min-w-0 flex-col [&>*:last-child]:mb-0">
        {children}
      </div>
    </section>
  );
}
