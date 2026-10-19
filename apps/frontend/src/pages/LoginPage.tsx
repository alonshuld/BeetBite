import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input, ButtonPrimary, Logo, Icon } from "@/components/atoms";
import { LangToggle, ThemeToggle } from "@/components/molecules";
import { useLang } from "@/contexts/useLang";
import { useLoginMutation } from "@/api/endpoints/auth";
import { useAppDispatch } from "@/app/hooks";
import { setCredentials } from "@/features/auth/authSlice";
import { describeApiError, toApiError } from "@/api/apiErrors";

export default function LoginPage() {
  const { t, lang, setLang } = useLang();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [login, { isLoading }] = useLoginMutation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username || !password) {
      setError(t("fillFields"));
      return;
    }
    setError("");
    try {
      const data = await login({ username, password }).unwrap();
      dispatch(setCredentials({ token: data.accessToken }));
      await navigate("/");
    } catch (err: unknown) {
      const apiError = toApiError(err);
      setError(
        apiError.code || apiError.message
          ? describeApiError(apiError, lang, t)
          : t("loginFailed"),
      );
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-(--bg) px-4">
      {/* One wash of beet across the top edge, so the door to the app is
          recognisably the app. Nothing else decorates this screen. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[45vh]"
        style={{
          background:
            "linear-gradient(to bottom, var(--beet-glow), transparent 70%)",
        }}
      />

      <div className="absolute top-4 flex items-center gap-2 ltr:right-4 rtl:left-4">
        <ThemeToggle />
        <LangToggle lang={lang} onChange={setLang} />
      </div>

      <div className="relative flex w-full max-w-[380px] flex-col gap-7">
        <div className="flex flex-col items-center gap-3">
          <Logo size={64} />
          <div className="text-center">
            <h1 className="font-display text-[30px] leading-tight text-text">
              BeetBite
            </h1>
            <p className="text-sm text-text-muted">
              {t("constructionPlatform")}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-6 shadow-pop">
          <form
            onSubmit={(e) => {
              void handleSubmit(e);
            }}
            className="flex flex-col gap-4"
            noValidate
          >
            <Input
              id="username"
              label={t("username")}
              placeholder="admin"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <Input
              id="password"
              type="password"
              label={t("password")}
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-field border border-danger/25 bg-danger/8 px-3.5 py-2.5 text-sm font-medium text-danger"
              >
                <Icon name="alert" size={16} className="mt-0.5" />
                {error}
              </p>
            )}

            <ButtonPrimary
              type="submit"
              disabled={isLoading}
              className="mt-1 w-full"
            >
              {isLoading ? t("signingIn") : t("signIn")}
            </ButtonPrimary>
          </form>
        </div>

        <p className="text-center text-label text-text-dim">{t("copyright")}</p>
      </div>
    </div>
  );
}
