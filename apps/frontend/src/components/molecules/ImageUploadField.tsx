import { ChangeEvent, useId, useRef } from "react";
import { useLang } from "@/contexts/useLang";
import { useToast } from "@/contexts/useToast";
import { ButtonGhost } from "@/components/atoms/Button";
import { Icon } from "@/components/atoms/Icon";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_SIZE_BYTES = 3 * 1024 * 1024;

interface ImageUploadFieldProps {
  label: string;
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}

export function ImageUploadField({
  label,
  value,
  onChange,
}: ImageUploadFieldProps) {
  const { t } = useLang();
  const { toast } = useToast();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast(t("invalidImageType"), "error");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast(t("imageTooLarge"), "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={inputId}
        className="text-label font-semibold text-text-muted"
      >
        {label}
      </label>
      {value ? (
        <div className="flex items-center gap-3">
          <img
            src={value}
            alt={label}
            className="w-16 h-16 object-contain rounded-sm bg-surface-3 border border-border"
          />
          <ButtonGhost type="button" onClick={() => onChange(null)}>
            {t("remove")}
          </ButtonGhost>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-1 px-3 py-6 rounded-sm bg-surface-3 border border-dashed border-border text-text-dim text-sm hover:border-beet hover:text-text-muted transition-colors"
        >
          <Icon name="image" size={20} className="text-text-dim" />
          {t("clickToUpload")}
        </button>
      )}
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
