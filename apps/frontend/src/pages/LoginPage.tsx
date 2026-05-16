import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input, ButtonPrimary } from "@/components/atoms";
import { LangToggle } from "@/components/molecules";
import { useLang } from "@/contexts/useLang";
import { useLoginMutation } from "@/api/endpoints/auth";
import { useAppDispatch } from "@/app/hooks";
import { setCredentials } from "@/features/auth/authSlice";

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
      const msg =
        err &&
        typeof err === "object" &&
        "data" in err &&
        err.data &&
        typeof err.data === "object" &&
        "message" in err.data
          ? String(err.data.message)
          : "Login failed";
      setError(msg);
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-[var(--bg)] px-4">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 600px 400px at 50% 40%, oklch(52% 0.22 5 / 0.12), transparent)",
        }}
      />

      <div className="absolute top-4 right-4 rtl:right-auto rtl:left-4">
        <LangToggle lang={lang} onChange={setLang} />
      </div>

      <div className="relative w-full max-w-[400px] flex flex-col gap-8">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-[52px] h-[52px] flex items-center justify-center bg-beet text-[26px]"
            style={{ borderRadius: 14 }}
          >
            🫀
          </div>
          <div className="text-center">
            <h1 className="font-serif text-[32px] text-text leading-tight">
              BeetBite
            </h1>
            <p className="text-[14px] text-text-muted">
              {t("constructionPlatform")}
            </p>
          </div>
        </div>

        <div className="bg-surface rounded p-7">
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

            {error && <p className="text-sm text-danger">{error}</p>}

            <ButtonPrimary
              type="submit"
              disabled={isLoading}
              className="w-full justify-center py-3"
            >
              {isLoading ? t("signingIn") : t("signIn")}
            </ButtonPrimary>
          </form>
        </div>

        <p className="text-center text-[12px] text-text-dim">
          {t("copyright")}
        </p>
      </div>
    </div>
  );
}
