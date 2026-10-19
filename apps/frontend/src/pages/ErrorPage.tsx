import {
  useRouteError,
  isRouteErrorResponse,
  useNavigate,
} from "react-router-dom";
import { useLang } from "@/contexts/useLang";
import { ButtonPrimary } from "@/components/atoms/Button";
import { Icon } from "@/components/atoms/Icon";

export default function ErrorPage() {
  const { t } = useLang();
  const navigate = useNavigate();
  const error = useRouteError();

  const is404 = isRouteErrorResponse(error) && error.status === 404;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center bg-(--bg)">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-text-dim">
        <Icon name="alert" size={26} />
      </div>

      <div className="flex flex-col gap-2 max-w-xs">
        <h1 className="font-display text-2xl text-text">
          {is404 ? t("pageNotFound") : t("errorTitle")}
        </h1>
        <p className="text-text-muted text-sm">
          {is404 ? t("pageNotFoundDescription") : t("errorDescription")}
        </p>
      </div>

      {is404 ? (
        <ButtonPrimary
          onClick={() => {
            void navigate("/");
          }}
        >
          {t("goHome")}
        </ButtonPrimary>
      ) : (
        <ButtonPrimary onClick={() => window.location.reload()}>
          {t("reload")}
        </ButtonPrimary>
      )}
    </div>
  );
}
