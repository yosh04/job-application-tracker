import { useEffect, useState } from "react";
import { Button, Input, Label, Modal } from "./ui";

export function LoginModal({
  open,
  onClose,
  onLogin,
}: {
  open: boolean;
  onClose: () => void;
  onLogin: (email: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (open) {
      setEmail("");
      setPassword("");
    }
  }, [open]);

  const valid = email.trim().length > 3 && email.includes("@") && password.length > 0;

  const submit = () => {
    if (!valid) return;
    // TODO(supabase): replace with supabase.auth.signInWithPassword({ email, password })
    onLogin(email.trim());
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-md"
      title="Iniciar sesión"
      subtitle="Prototipo local: no se valida contra ningún servidor."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" disabled={!valid} onClick={submit}>
            Iniciar sesión
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
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && valid && submit()}
          />
        </div>
        <div>
          <Label>Contraseña</Label>
          <Input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && valid && submit()}
          />
        </div>
        <p className="text-[11.5px] leading-relaxed text-faint">
          Prototipo sin backend: cualquier correo y contraseña funcionan. Con Supabase, este formulario usará{" "}
          <span className="font-mono text-muted">supabase.auth.signInWithPassword</span>.
        </p>
      </div>
    </Modal>
  );
}
