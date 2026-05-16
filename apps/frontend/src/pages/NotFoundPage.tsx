import { useNavigate } from "react-router-dom";
import { useLang } from "@/contexts/useLang";
import { ButtonPrimary } from "@/components/atoms/Button";

export default function NotFoundPage() {
  const { t } = useLang();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center bg-bg">
      <span className="text-[80px] font-serif font-bold text-beet leading-none select-none">
        404
      </span>

      <div className="flex flex-col gap-2 max-w-xs">
        <h1 className="font-serif text-xl text-text">{t("pageNotFound")}</h1>
        <p className="text-text-muted text-sm">{t("pageNotFoundDescription")}</p>
      </div>

      <ButtonPrimary onClick={() => navigate("/")}>
        {t("goHome")}
      </ButtonPrimary>
    </div>
  );
}
