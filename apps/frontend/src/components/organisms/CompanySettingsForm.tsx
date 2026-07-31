import { useLang } from "@/contexts/useLang";
import { Input } from "@/components/atoms/Input";
import { Textarea } from "@/components/atoms/Textarea";
import { FormGroup, FormRow } from "@/components/molecules/FormGroup";
import { ImageUploadField } from "@/components/molecules/ImageUploadField";

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
    <div>
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
          onChange={(e) => onChange({ ...value, description: e.target.value })}
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
    </div>
  );
}
