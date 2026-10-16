import React, { useEffect, useId, useRef, useState } from "react";
import { cn } from "../utils/cn";
import { STATUS_META, type Status } from "../types";

/* ------------------------------------------------------------------ icons */

const PATHS: Record<string, React.ReactNode> = {
  plus: <path d="M12 5v14M5 12h14" />,
  folder: <path d="M3 7a2 2 0 0 1 2-2h3.6a2 2 0 0 1 1.6.8L11.5 7H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  caret: <path d="m6 9 6 6 6-6" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </>
  ),
  dots: (
    <>
      <circle cx="12" cy="5" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="12" cy="19" r="1.4" />
    </>
  ),
  pencil: <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />,
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M15 5.5A2.5 2.5 0 0 0 12.5 3h-7A2.5 2.5 0 0 0 3 5.5v7A2.5 2.5 0 0 0 5.5 15" />
    </>
  ),
  move: <path d="M4 8h13l-3-3m3 3-3 3M20 16H7l3-3m-3 3 3 3" />,
  trash: <path d="M4 7h16M9 7V5h6v2m-8 0 1 13h8l1-13M10 11v6m4-6v6" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  external: <path d="M14 4h6v6m0-6-8.5 8.5M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />,
  file: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5" />
    </>
  ),
  upload: <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M4 17v1.5A2.5 2.5 0 0 0 6.5 21h11A2.5 2.5 0 0 0 20 18.5V17" />,
  download: <path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  check: <path d="m5 13 4.5 4.5L19 7" />,
  briefcase: (
    <>
      <rect x="3" y="7.5" width="18" height="12.5" rx="2" />
      <path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M3 12.5h18" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s6.5-6.2 6.5-11a6.5 6.5 0 1 0-13 0C5.5 14.8 12 21 12 21Z" />
      <circle cx="12" cy="10" r="2.4" />
    </>
  ),
  link: <path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.3-2.3a4 4 0 0 0-5.7-5.7l-1 1m-1 4.5a4 4 0 0 1-5.7 0 4 4 0 0 1 0-5.7l2.3-2.3" />,
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 9.5h17M8 3.5v3m8-3v3" />
    </>
  ),
  grid: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  back: <path d="M19 12H5m0 0 6-6m-6 6 6 6" />,
  spark: <path d="M12 3v4m0 10v4M3 12h4m10 0h4m-2.6-6.4-2.8 2.8m-7.2 7.2-2.8 2.8m0-12.8 2.8 2.8m7.2 7.2 2.8 2.8" />,
  note: <path d="M5 4.5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1ZM8 9h8M8 13h8M8 17h4" />,
  trend: <path d="M4 17l5-5 3.5 3.5L20 8m0 0h-4.5M20 8v4.5" />,
  layers: <path d="m12 3 8.5 4.5L12 12 3.5 7.5 12 3Zm8.5 9L12 16.5 3.5 12m17 4.5L12 21l-8.5-4.5" />,
};

export function Icon({
  name,
  className,
  strokeWidth = 1.6,
}: {
  name: keyof typeof PATHS | string;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-4 w-4 shrink-0", className)}
      aria-hidden="true"
    >
      {PATHS[name] ?? null}
    </svg>
  );
}

/* ----------------------------------------------------------------- button */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "subtle" | "danger" | "outline";
  size?: "xs" | "sm" | "md";
};

export function Button({ variant = "subtle", size = "sm", className, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-all duration-150 select-none disabled:opacity-40 disabled:pointer-events-none",
        size === "xs" && "h-7 px-2.5 text-[12px]",
        size === "sm" && "h-8.5 px-3 text-[13px]",
        size === "md" && "h-10 px-4 text-sm",
        variant === "primary" &&
          "bg-brand text-white hover:bg-blue-500 shadow-[0_1px_0_0_rgba(255,255,255,0.14)_inset,0_6px_20px_-10px_rgba(59,130,246,0.9)]",
        variant === "subtle" && "bg-elev2 text-ink border border-line hover:border-line2 hover:bg-[#1a2334]",
        variant === "outline" && "border border-line text-muted hover:text-ink hover:border-line2 bg-transparent",
        variant === "ghost" && "text-muted hover:text-ink hover:bg-white/5",
        variant === "danger" && "border border-red-500/25 bg-red-500/10 text-red-300 hover:bg-red-500/18",
        className,
      )}
    />
  );
}

export function IconButton({
  className,
  label,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      {...rest}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-white/6 hover:text-ink",
        className,
      )}
    />
  );
}

/* ------------------------------------------------------------------ modal */

const activeDialogs: HTMLElement[] = [];

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    activeDialogs.push(dialog);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = dialog.querySelector<HTMLElement>("[autofocus]") ?? dialog.querySelector<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    (focusable ?? dialog).focus();

    const onKey = (event: KeyboardEvent) => {
      if (activeDialogs[activeDialogs.length - 1] !== dialog) return;
      if (event.key === "Escape") {
        if (dialog.querySelector('[role="menu"]')) return;
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const elements = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.getAttribute("type") !== "hidden");
      if (elements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      const index = activeDialogs.lastIndexOf(dialog);
      if (index >= 0) activeDialogs.splice(index, 1);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="anim-fade absolute inset-0 bg-black/72 backdrop-blur-[3px]" onClick={onClose} />
      <div
        ref={dialogRef}
        className={cn(
          "anim-pop relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-xl border border-line2 bg-panel shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] sm:rounded-xl",
          width,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 id={titleId} className="text-[15px] font-semibold tracking-tight text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[12.5px] text-muted">{subtitle}</p>}
          </div>
          <IconButton label="Cerrar" onClick={onClose} className="-mt-1 -mr-1">
            <Icon name="x" />
          </IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-line bg-surface/60 px-5 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ fields */

export function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between">
      <label className="text-[12px] font-medium tracking-wide text-muted uppercase">{children}</label>
      {hint && <span className="text-[11px] text-faint">{hint}</span>}
    </div>
  );
}

const fieldBase =
  "w-full rounded-md border border-line bg-surface px-3 py-2.5 text-[13.5px] text-ink transition-colors placeholder:text-faint focus:border-brand/60 focus:bg-elev focus:outline-none";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(fieldBase, props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(fieldBase, "resize-y leading-relaxed", props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={cn(fieldBase, "appearance-none pr-9 cursor-pointer [&>option]:bg-panel", props.className)}
      />
      <Icon name="caret" className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-faint" />
    </div>
  );
}

/* -------------------------------------------------------------- status ui */

export function StatusDot({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      className={cn("inline-block h-2 w-2 shrink-0 rounded-full", className)}
      style={{ background: STATUS_META[status].dot, boxShadow: `0 0 8px ${STATUS_META[status].dot}66` }}
    />
  );
}

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12px] font-medium",
        STATUS_META[status].chip,
        className,
      )}
    >
      <StatusDot status={status} className="h-1.5 w-1.5" />
      {status}
    </span>
  );
}

/* ---------------------------------------------------------------- dropdown */

export function Dropdown({
  trigger,
  children,
  align = "right",
  width = "w-48",
}: {
  trigger: (open: boolean) => React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  align?: "left" | "right";
  width?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const getTrigger = () =>
    triggerRef.current?.querySelector<HTMLElement>("button, [role='button'], [tabindex='0']");

  useEffect(() => {
    const triggerElement = getTrigger();
    triggerElement?.setAttribute("aria-haspopup", "menu");
    triggerElement?.setAttribute("aria-expanded", String(open));
    triggerElement?.setAttribute("aria-controls", menuId);
  }, [open, menuId]);

  useEffect(() => {
    if (!open) return;
    const firstItem = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])');
    firstItem?.focus();
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    getTrigger()?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? [],
    );
    const activeIndex = items.indexOf(document.activeElement as HTMLElement);
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const next = activeIndex < 0
        ? direction > 0 ? 0 : items.length - 1
        : (activeIndex + direction + items.length) % items.length;
      items[next]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      items[items.length - 1]?.focus();
    }
  };

  return (
    <div
      className="relative"
      ref={ref}
      onKeyDown={handleKeyDown}
      onBlur={(event) => {
        if (event.relatedTarget instanceof Node && !ref.current?.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <div ref={triggerRef} onClick={() => setOpen((value) => !value)}>{trigger(open)}</div>
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          className={cn(
            "anim-slide absolute z-40 mt-1.5 overflow-hidden rounded-lg border border-line2 bg-elev p-1 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.85)]",
            width,
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {children(close)}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  icon,
  children,
  onClick,
  danger,
  disabled,
  hint,
}: {
  icon?: string;
  children: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      role="menuitem"
      className={cn(
        "flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-left text-[13px] transition-colors disabled:opacity-40",
        danger ? "text-red-300 hover:bg-red-500/12" : "text-muted hover:bg-white/6 hover:text-ink",
      )}
    >
      {icon && <Icon name={icon} className={cn("h-4 w-4", danger ? "text-red-300/80" : "text-faint")} />}
      <span className="flex-1">{children}</span>
      {hint && <span className="font-mono text-[10.5px] text-faint">{hint}</span>}
    </button>
  );
}

export function MenuSeparator() {
  return <div className="my-1 h-px bg-line2" />;
}

/* ------------------------------------------------------------------- misc */

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-[11.5px] font-semibold tracking-[0.14em] text-faint uppercase">{children}</h3>
      {action}
    </div>
  );
}

export function Empty({ icon, title, text, action }: { icon: string; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line2 bg-surface/40 px-6 py-14 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-line2 bg-elev text-brand-soft">
        <Icon name={icon} className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="mt-1 max-w-xs text-[13px] leading-relaxed text-muted">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
