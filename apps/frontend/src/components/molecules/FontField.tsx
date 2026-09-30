import { useEffect } from "react";
import { Select } from "@/components/atoms/Select";
import type { PdfFont } from "@/api/endpoints/companySettings";

/*
 * The fonts the backend can embed in exported PDFs (`src/common/pdf-fonts.ts`
 * there) — every one covers Hebrew. `family` is both the display name and the
 * Google Fonts family used to preview it here.
 */
const PDF_FONT_OPTIONS: Record<PdfFont, { family: string }> = {
  "noto-sans-hebrew": { family: "Noto Sans Hebrew" },
  heebo: { family: "Heebo" },
  rubik: { family: "Rubik" },
  assistant: { family: "Assistant" },
  "frank-ruhl-libre": { family: "Frank Ruhl Libre" },
  "david-libre": { family: "David Libre" },
};

// Loads a font for the preview, once per family. Only the settings form needs
// these, so they are fetched when picked rather than on every page load.
function loadPreviewFont(family: string) {
  const id = `pdf-font-preview-${family.replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/\s+/g, "+")}:wght@400;700&display=swap`;
  document.head.appendChild(link);
}

interface FontFieldProps {
  id?: string;
  label: string;
  value: PdfFont;
  onChange: (font: PdfFont) => void;
  previewText: string;
}

export function FontField({
  id,
  label,
  value,
  onChange,
  previewText,
}: FontFieldProps) {
  const { family } = PDF_FONT_OPTIONS[value];

  useEffect(() => loadPreviewFont(family), [family]);

  return (
    <div className="flex flex-col gap-2">
      <Select
        id={id}
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value as PdfFont)}
      >
        {Object.entries(PDF_FONT_OPTIONS).map(([font, option]) => (
          <option key={font} value={font}>
            {option.family}
          </option>
        ))}
      </Select>
      <p
        data-testid="pdf-font-preview"
        className="rounded-sm border border-border bg-surface px-3 py-2 text-base"
        style={{ fontFamily: `"${family}", sans-serif` }}
      >
        {previewText} <span className="font-bold">1,234.56 ₪</span>
      </p>
    </div>
  );
}
