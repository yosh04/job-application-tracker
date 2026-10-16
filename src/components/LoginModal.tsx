import { useEffect, useState } from "react";
import { Button, Input, Label, Modal } from "./ui";
import { isSupabaseConfigured } from "../lib/supabaseClient";

type Mode = "login" | "register" | "recovery";

export function LoginModal({
  open,
  onClose,
  onLogin,
  onRegister,
  onRecovery,
  onGoogle,
}: {
  open: boolean;
  onClose: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string) => Promise<"confirmed" | "check-email">;
  onRecovery: (email: string) => Promise<void>;
  onGoogle: () => Promise<void>;
}) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [googlePending, setGooglePending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMode("login");
      setEmail("");
      setPassword("");
      setError(null);
      setSuccess(null);
      setPending(false);
      setGooglePending(false);
    }
  }, [open ]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setSuccess(null);
    setPending(false);
  };

  const needsPassword = mode !== "recovery";
  const valid =
    email.trim().length > 3 && email.includes("@") && (!needsPassword || password.length > 0) && !pending;

  const submit = async () => {
    if (!valid) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      if (mode === "login") {
        await onLogin(email.trim(), password);
      } else if (mode === "register") {
        const result = await onRegister(email.trim(), password);
        if (result === "check-email") {
          setSuccess("Cuenta creada. Revisa tu correo para confirmar tu cuenta.");
        }
        // "confirmed" path closes the modal via App handler side-effects below.
      } else {
        await onRecovery(email.trim());
        setSuccess("Si existe una cuenta con ese correo, recibirás un enlace de recuperación.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar la operación.");
    } finally {
      setPending(false);
    }
  };

  // Google OAuth redirects away on success; only failures surface inline.
  const submitGoogle = async () => {
    if (googlePending || pending) return;
    setGooglePending(true);
    setError(null);
    try {
      await onGoogle();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar sesión con Google.");
    } finally {
      setGooglePending(false);
    }
  };
  const title = mode === "login" ? "Iniciar sesión" : mode === "register" ? "Crear cuenta" : "Recuperar contraseña";
  const subtitle = isSupabaseConfigured
    ? mode === "login"
      ? "Ingresa con tu cuenta de JobTrack."
      : mode === "register"
        ? "Crea tu cuenta de JobTrack."
        : "Te enviaremos un enlace para restablecer tu contraseña."
    : "Prototipo local: no se valida contra ningún servidor.";
  const cta =
    pending && mode === "login"
      ? "Ingresando…"
      : pending && mode === "register"
        ? "Creando…"
        : pending
          ? "Enviando…"
          : mode === "login"
            ? "Iniciar sesión"
            : mode === "register"
              ? "Crear cuenta"
              : "Enviar enlace";

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-md"
      title={title}
      subtitle={subtitle}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" disabled={!valid} onClick={submit}>
            {cta}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {isSupabaseConfigured && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={pending || googlePending}
              onClick={() => void submitGoogle()}
            >
              {googlePending ? "Conectando con Google…" : "Continuar con Google"}
            </Button>
            <div className="flex items-center gap-3 text-[11px] text-faint">
              <span className="h-px flex-1 bg-line" />
              <span>o</span>
              <span className="h-px flex-1 bg-line" />
            </div>
          </>
        )}
        <div>
          <Label>Correo electrónico</Label>
          <Input
            autoFocus
            type="email"
            placeholder="tu@correo.com"
            value={email}
            disabled={pending}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && valid && void submit()}
          />
        </div>
        {needsPassword && (
          <div>
            <Label>Contraseña</Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              disabled={pending}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && valid && void submit()}
            />
          </div>
        )}
        {error && <p className="text-[12px] leading-relaxed text-red-400">{error}</p>}
        {success && <p className="text-[12px] leading-relaxed text-emerald-300">{success}</p>}
        {!isSupabaseConfigured && (
          <p className="text-[11.5px] leading-relaxed text-faint">
            Prototipo sin backend: cualquier correo y contraseña funcionan.
          </p>
        )}
        <div className="flex flex-col gap-1 pt-1 text-[12.5px]">
          {mode === "login" && (
            <>
              <button
                type="button"
                className="w-fit text-brand-soft transition-colors hover:text-ink"
                onClick={() => switchMode("register")}
              >
                ¿No tienes cuenta? Crear cuenta
              </button>
              <button
                type="button"
                className="w-fit text-muted transition-colors hover:text-ink"
                onClick={() => switchMode("recovery")}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </>
          )}
          {mode === "register" && (
            <button
              type="button"
              className="w-fit text-brand-soft transition-colors hover:text-ink"
              onClick={() => switchMode("login")}
            >
              ¿Ya tienes cuenta? Iniciar sesión
            </button>
          )}
          {mode === "recovery" && (
            <button
              type="button"
              className="w-fit text-brand-soft transition-colors hover:text-ink"
              onClick={() => switchMode("login")}
            >
              Volver a iniciar sesión
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
