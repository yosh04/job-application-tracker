import { useEffect, useState } from "react";
import { Button, Input, Label, Modal } from "./ui";
import { isSupabaseConfigured } from "../lib/supabaseClient";

export function LoginModal({
  open,
  onClose,
  onLogin,
}: {
  open: boolean;
  onClose: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setEmail("");
      setPassword("");
      setError(null);
      setPending(false);
    }
  }, [open]);

  const valid = email.trim().length > 3 && email.includes("@") && password.length > 0 && !pending;

  const submit = async () => {
    if (!valid) return;
    setPending(true);
    setError(null);
    try {
      await onLogin(email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar sesión.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-md"
      title="Iniciar sesión"
      subtitle={
        isSupabaseConfigured
          ? "Ingresa con tu cuenta de JobTrack."
          : "Prototipo local: no se valida contra ningún servidor."
      }
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" disabled={!valid} onClick={submit}>
            {pending ? "Ingresando…" : "Iniciar sesión"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
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
        {error && <p className="text-[12px] leading-relaxed text-red-400">{error}</p>}
        {!isSupabaseConfigured && (
          <p className="text-[11.5px] leading-relaxed text-faint">
            Prototipo sin backend: cualquier correo y contraseña funcionan.
          </p>
        )}
      </div>
    </Modal>
  );
}
