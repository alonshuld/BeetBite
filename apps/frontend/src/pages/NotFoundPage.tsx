import { useNavigate } from "react-router-dom";
import { useLang } from "@/contexts/useLang";
import { ButtonPrimary } from "@/components/atoms/Button";

export default function NotFoundPage() {
  const { t } = useLang();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-(--bg) p-8 text-center">
      {/* The number is the whole illustration — set large in the serif and
          left to carry the screen on its own. */}
      <span className="tnum select-none font-display text-[104px] font-bold leading-none text-beet">
        404
      </span>

      <div className="flex flex-col gap-2 max-w-xs">
        <h1 className="text-title text-text">{t("pageNotFound")}</h1>
        <p className="text-text-muted text-sm">
          {t("pageNotFoundDescription")}
        </p>
      </div>

      <ButtonPrimary
        onClick={() => {
          void navigate("/");
        }}
      >
        {t("goHome")}
      </ButtonPrimary>
    </div>
  );
}
