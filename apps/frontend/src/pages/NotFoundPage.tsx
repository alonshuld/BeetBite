import { useLang } from "@/contexts/useLang";

export default function NotFoundPage() {
  const { t } = useLang();
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-text-muted">
      <span className="text-5xl">404</span>
      <p className="text-lg">{t("pageNotFound")}</p>
    </div>
  );
}
