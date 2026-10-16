import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "./utils/cn";
import { Sidebar } from "./components/Sidebar";
import { Overview } from "./components/Overview";
import { SearchDashboard } from "./components/SearchDashboard";
import { ApplicationView } from "./components/ApplicationView";
import { ApplicationModal, ConfirmModal, CVModal, MoveModal, SearchModal, Toast } from "./components/Modals";
import { LoginModal } from "./components/LoginModal";
import { Button, Icon } from "./components/ui";
import { SEED_APPLICATIONS, SEED_SEARCHES } from "./seed";
import { supabase, isSupabaseConfigured } from "./lib/supabaseClient";
import { todayISO, uid, type Application, type InterestPoint, type Search, type Status, type View } from "./types";

type ModalState =
  | { type: "search"; editing?: Search }
  | { type: "application"; searchId?: string; editing?: Application }
  | { type: "move"; appId: string }
  | { type: "cv"; appId: string }
  | { type: "confirm-search"; id: string }
  | { type: "confirm-app"; id: string }
  | { type: "login" }
  | { type: null };

export default function App() {
  const [searches, setSearches] = useState<Search[]>(SEED_SEARCHES);
  const [apps, setApps] = useState<Application[]>(SEED_APPLICATIONS);
  const [view, setView] = useState<View>({ type: "overview" });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ s_frontend: true, s_backend: true, s_remoto: true });
  const [drawer, setDrawer] = useState(false);
  const [modal, setModal] = useState<ModalState>({ type: null });
  const [toast, setToast] = useState<string | null>(null);
  const [user, setUser] = useState<string | null>(null);

  const closeModal = () => setModal({ type: null });
  const notify = useCallback((message: string) => setToast(message), []);

  // Sync React state with the Supabase auth session (keeps email-string shape).
  // Resolve OAuth redirect sessions, then clean the URL hash for a tidy UI.
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user?.email ?? null);
      if (window.location.hash.includes("access_token")) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user?.email ?? null);
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleLogin = useCallback(
    async (email: string, password: string) => {
      if (!supabase) {
        // Prototype fallback: no backend configured, accept anything.
        setUser(email);
        closeModal();
        notify("Sesión iniciada (prototipo)");
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      closeModal();
      notify("Sesión iniciada");
    },
    [notify],
  );

  const handleRegister = useCallback(
    async (email: string, password: string): Promise<"confirmed" | "check-email"> => {
      if (!supabase) {
        // Prototype fallback: no backend configured, accept anything.
        setUser(email);
        closeModal();
        notify("Cuenta creada (prototipo)");
        return "confirmed";
      }
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (data.session) {
        closeModal();
        notify("Cuenta creada");
        return "confirmed";
      }
      return "check-email";
    },
    [notify],
  );

  const handleRecovery = useCallback(
    async (email: string) => {
      if (!supabase) {
        notify("Prototipo sin backend: no se envió ningún correo");
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
    },
    [notify],
  );

  const handleGoogle = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
    // Success path redirects away; session resolves via getSession + onAuthStateChange.
  }, []);

  const handleSignOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    notify("Sesión cerrada");
  }, [notify]);

  const currentSearch = "searchId" in view ? searches.find((s) => s.id === view.searchId) : undefined;
  const currentApp = view.type === "application" ? apps.find((a) => a.id === view.id) : undefined;

  /* ------------------------------------------------------------ navigation */

  const openSearch = (id: string) => {
    setExpanded((e) => ({ ...e, [id]: true }));
    setView({ type: "dashboard", searchId: id });
    setDrawer(false);
  };

  const openApp = (id: string) => {
    const app = apps.find((a) => a.id === id);
    if (app) setExpanded((e) => ({ ...e, [app.searchId]: true }));
    setView({ type: "application", id });
    setDrawer(false);
  };

  /* --------------------------------------------------------------- actions */

  const createSearch = (data: { name: string; description: string }) => {
    const search: Search = { id: uid("s"), name: data.name, description: data.description, createdAt: todayISO() };
    setSearches((s) => [...s, search]);
    setExpanded((e) => ({ ...e, [search.id]: true }));
    closeModal();
    setView({ type: "dashboard", searchId: search.id });
    notify(`Búsqueda "${search.name}" creada`);
  };

  const updateSearch = (id: string, data: { name: string; description: string }) => {
    setSearches((s) => s.map((x) => (x.id === id ? { ...x, ...data } : x)));
    closeModal();
    notify("Búsqueda actualizada");
  };

  const deleteSearch = (id: string) => {
    const name = searches.find((s) => s.id === id)?.name ?? "";
    setSearches((s) => s.filter((x) => x.id !== id));
    setApps((a) => a.filter((x) => x.searchId !== id));
    closeModal();
    setView({ type: "overview" });
    notify(`Búsqueda "${name}" eliminada`);
  };

  // TODO(supabase): migrate images to Supabase Storage bucket, persist public URLs instead of data-URLs.
  const patchApp = (id: string, patch: Partial<Application>) =>
    setApps((list) => list.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: todayISO() } : a)));

  const saveApplication = (data: Omit<Application, "id" | "createdAt" | "updatedAt">) => {
    // TODO(supabase): upload data-URL images to Supabase Storage bucket on save, store returned URLs.
    if (modal.type === "application" && modal.editing) {
      const id = modal.editing.id;
      setApps((list) => list.map((a) => (a.id === id ? { ...a, ...data, updatedAt: todayISO() } : a)));
      closeModal();
      notify("Postulación actualizada");
      return;
    }
    const app: Application = {
      ...data,
      id: uid("a"),
      createdAt: todayISO(),
      updatedAt: todayISO(),
    };
    setApps((list) => [app, ...list]);
    setExpanded((e) => ({ ...e, [app.searchId]: true }));
    closeModal();
    setView({ type: "application", id: app.id });
    notify(`Postulación de ${app.company} creada`);
  };

  const duplicateApp = (id: string) => {
    const source = apps.find((a) => a.id === id);
    if (!source) return;
    const copy: Application = {
      ...source,
      id: uid("a"),
      company: `${source.company} (copia)`,
      points: source.points.map((p) => ({ ...p, id: uid("p") })),
      images: [...(source.images ?? [])],
      createdAt: todayISO(),
      updatedAt: todayISO(),
    };
    setApps((list) => [copy, ...list]);
    notify("Postulación duplicada");
  };

  const moveApp = (appId: string, targetId: string, newSearchName?: string) => {
    const app = apps.find((a) => a.id === appId);
    if (!app) return;
    let finalTarget = targetId;
    let targetName = searches.find((s) => s.id === targetId)?.name ?? "";

    if (targetId === "__new__") {
      const created: Search = {
        id: uid("s"),
        name: newSearchName?.trim() || "Nueva búsqueda",
        description: "",
        createdAt: todayISO(),
      };
      setSearches((s) => [...s, created]);
      finalTarget = created.id;
      targetName = created.name;
      setExpanded((e) => ({ ...e, [created.id]: true }));
    }

    patchApp(appId, { searchId: finalTarget });
    setExpanded((e) => ({ ...e, [finalTarget]: true }));
    closeModal();
    if (view.type === "application") setView({ type: "dashboard", searchId: finalTarget });
    notify(`${app.company} movida a "${targetName}"`);
  };

  const deleteApp = (id: string) => {
    const app = apps.find((a) => a.id === id);
    setApps((list) => list.filter((a) => a.id !== id));
    closeModal();
    const searchId = app?.searchId;
    setView(searchId ? { type: "dashboard", searchId } : { type: "overview" });
    notify(`Postulación de ${app?.company} eliminada`);
  };

  const pointHandlers = {
    onAddPoint: (title: string, content: string) => {
      if (!currentApp) return;
      const point: InterestPoint = { id: uid("p"), title, content };
      patchApp(currentApp.id, { points: [...currentApp.points, point] });
      notify("Punto de interés agregado");
    },
    onSavePoint: (pointId: string, title: string, content: string) => {
      if (!currentApp) return;
      patchApp(currentApp.id, { points: currentApp.points.map((p) => (p.id === pointId ? { ...p, title, content } : p)) });
      notify("Punto actualizado");
    },
    onDeletePoint: (pointId: string) => {
      if (!currentApp) return;
      patchApp(currentApp.id, { points: currentApp.points.filter((p) => p.id !== pointId) });
      notify("Punto eliminado");
    },
  };

  /* ---------------------------------------------------------------- derived */

  const dashApps = useMemo(
    () => (view.type === "dashboard" ? apps.filter((a) => a.searchId === view.searchId) : []),
    [apps, view],
  );

  const breadcrumb =
    view.type === "overview"
      ? "Resumen general"
      : view.type === "dashboard"
        ? currentSearch?.name ?? ""
        : `${searches.find((s) => s.id === currentApp?.searchId)?.name ?? ""} / ${currentApp?.company ?? ""}`;

  /* ------------------------------------------------------------------- view */

  // Real backend without session: overview stays visible, inner views are gated.
  const locked = isSupabaseConfigured && !user;
  const openLogin = () => setModal({ type: "login" });

  const sidebar = (
    <Sidebar
      searches={searches}
      applications={apps}
      view={view}
      expanded={expanded}
      onToggle={(id) => setExpanded((e) => ({ ...e, [id]: !e[id] }))}
      onSelectSearch={openSearch}
      onSelectApplication={openApp}
      onOverview={() => {
        setView({ type: "overview" });
        setDrawer(false);
      }}
      onNewSearch={() => setModal({ type: "search" })}
      onRenameSearch={(id) => setModal({ type: "search", editing: searches.find((s) => s.id === id) })}
      onDeleteSearch={(id) => setModal({ type: "confirm-search", id })}
      onNewApplication={(searchId) => setModal({ type: "application", searchId })}
      onClose={() => setDrawer(false)}
    />
  );

  return (
    <div className="flex h-screen overflow-hidden bg-base text-ink">
      {/* sidebar desktop */}
      <div className="hidden lg:block">{sidebar}</div>

      {/* drawer mobile */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="anim-fade absolute inset-0 bg-black/70 backdrop-blur-[2px]" onClick={() => setDrawer(false)} />
          <div className="anim-pop absolute top-0 left-0 h-full">{sidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* top bar */}
        <header className="relative flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface/80 px-4 backdrop-blur sm:px-5">
          <div className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-brand/45 to-transparent" />
          <button
            onClick={() => setDrawer(true)}
            className="inline-flex h-8.5 w-8.5 items-center justify-center rounded-md text-muted transition-colors hover:bg-white/6 hover:text-ink lg:hidden"
            aria-label="Abrir menú"
          >
            <Icon name="menu" className="h-4.5 w-4.5" />
          </button>

          <div className="hidden items-center gap-2 lg:flex">
            <span className="text-[13px] font-medium text-ink">JobTrack</span>
            <span className="text-faint">/</span>
            <span className="max-w-[280px] truncate text-[13px] text-muted">{breadcrumb}</span>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <span className="text-[13.5px] font-medium text-ink">JobTrack</span>
            <span className="truncate text-[12px] text-faint">{breadcrumb}</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="relative hidden md:block">
              <Icon name="search" className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
              <input
                placeholder="Buscar postulaciones…"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const q = (e.target as HTMLInputElement).value.trim().toLowerCase();
                    if (!q) return;
                    const found = apps.find(
                      (a) => a.company.toLowerCase().includes(q) || a.position.toLowerCase().includes(q),
                    );
                    if (found) openApp(found.id);
                  }
                }}
                className="h-8.5 w-[190px] rounded-md border border-line bg-base/60 pr-8 pl-8 text-[12.5px] text-ink transition-colors placeholder:text-faint focus:w-[240px] focus:border-brand/50 focus:outline-none"
              />
              <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 font-mono text-[10px] text-faint">
                ⌘K
              </span>
            </div>

            {user ? (
              <div className="flex items-center gap-2">
                <div
                  title={user}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-brand/30 bg-brand/12 text-[11.5px] font-semibold text-brand-soft"
                >
                  {user.slice(0, 1).toUpperCase()}
                </div>
                <button
                  onClick={handleSignOut}
                  className="text-[12px] text-muted transition-colors hover:text-ink"
                >
                  Salir
                </button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setModal({ type: "login" })}>
                Iniciar sesión
              </Button>
            )}
          </div>
        </header>

        {/* main */}
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="pointer-events-none fixed inset-x-0 top-0 h-64 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(59,130,246,0.07),transparent_70%)]" />

          {view.type === "overview" && (
            <>
              {locked && (
                <div className="mx-4 mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand/30 bg-brand/10 px-4 py-3 text-[13px] text-ink sm:mx-5">
                  <span>Inicia sesión para gestionar tus búsquedas y postulaciones.</span>
                  <Button variant="primary" size="sm" onClick={openLogin}>
                    Iniciar sesión
                  </Button>
                </div>
              )}
              <Overview
                searches={searches}
                applications={apps}
                onOpenSearch={openSearch}
                onOpenApplication={openApp}
                onNewSearch={() => setModal({ type: "search" })}
                onNewApplication={() => setModal({ type: "application", searchId: searches[0]?.id })}
              />
            </>
          )}

          {locked && view.type !== "overview" && (
            <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
              <div className="max-w-sm rounded-xl border border-line2 bg-surface/60 px-8 py-10">
                <p className="text-[15px] font-semibold text-ink">Contenido protegido</p>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">
                  Inicia sesión para ver tus búsquedas y postulaciones.
                </p>
                <div className="mt-5">
                  <Button variant="primary" size="sm" onClick={openLogin}>
                    Iniciar sesión
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!locked && view.type === "dashboard" &&
            (currentSearch ? (
              <SearchDashboard
                search={currentSearch}
                applications={dashApps}
                onOpenApplication={openApp}
                onNewApplication={() => setModal({ type: "application", searchId: currentSearch.id })}
                onRenameSearch={() => setModal({ type: "search", editing: currentSearch })}
                onDeleteSearch={() => setModal({ type: "confirm-search", id: currentSearch.id })}
                onStatusChange={(id, status) => {
                  patchApp(id, { status });
                  notify(`Estado actualizado a ${status}`);
                }}
                onDuplicate={duplicateApp}
                onMove={(id) => setModal({ type: "move", appId: id })}
                onDelete={(id) => setModal({ type: "confirm-app", id })}
                onOpenCv={(id) => setModal({ type: "cv", appId: id })}
              />
            ) : (
              <div className="p-10 text-center text-muted">Esta búsqueda ya no existe.</div>
            ))}

          {!locked && view.type === "application" &&
            (currentApp && searches.find((s) => s.id === currentApp.searchId) ? (
              <ApplicationView
                app={currentApp}
                search={searches.find((s) => s.id === currentApp.searchId)!}
                onBack={() => setView({ type: "dashboard", searchId: currentApp.searchId })}
                onEdit={() => setModal({ type: "application", editing: currentApp })}
                onDuplicate={() => duplicateApp(currentApp.id)}
                onMove={() => setModal({ type: "move", appId: currentApp.id })}
                onDelete={() => setModal({ type: "confirm-app", id: currentApp.id })}
                onStatusChange={(status: Status) => {
                  patchApp(currentApp.id, { status });
                  notify(`Estado actualizado a ${status}`);
                }}
                onSaveNotes={(notes) => {
                  patchApp(currentApp.id, { notes });
                  notify("Notas guardadas");
                }}
                onOpenCvModal={() => setModal({ type: "cv", appId: currentApp.id })}
                onRemoveCv={() => {
                  patchApp(currentApp.id, { cv: null });
                  notify("CV quitado de la postulación");
                }}
                onPatch={(patch) => patchApp(currentApp.id, patch)}
                {...pointHandlers}
              />
            ) : (
              <div className="p-10 text-center text-muted">Esta postulación ya no existe.</div>
            ))}
        </main>
      </div>

      {/* modals */}
      <SearchModal
        open={modal.type === "search"}
        onClose={closeModal}
        editing={modal.type === "search" ? modal.editing : undefined}
        onSave={(data) => (modal.type === "search" && modal.editing ? updateSearch(modal.editing.id, data) : createSearch(data))}
      />

      <ApplicationModal
        open={modal.type === "application"}
        onClose={closeModal}
        searches={searches}
        defaultSearchId={modal.type === "application" ? modal.searchId : undefined}
        editing={modal.type === "application" ? modal.editing : null}
        onSave={saveApplication}
      />

      <MoveModal
        open={modal.type === "move"}
        onClose={closeModal}
        app={modal.type === "move" ? apps.find((a) => a.id === modal.appId) : null}
        searches={searches.filter((s) => s.id !== currentApp?.searchId || modal.type !== "move")}
        onMove={(target, name) => modal.type === "move" && moveApp(modal.appId, target, name)}
      />

      <CVModal
        open={modal.type === "cv"}
        onClose={closeModal}
        app={modal.type === "cv" ? apps.find((a) => a.id === modal.appId) : null}
        onSave={(cv) => {
          if (modal.type !== "cv") return;
          patchApp(modal.appId, { cv });
          closeModal();
          notify(cv ? "CV asociado a la postulación" : "CV actualizado");
        }}
      />

      <ConfirmModal
        open={modal.type === "confirm-search"}
        onClose={closeModal}
        onConfirm={() => modal.type === "confirm-search" && deleteSearch(modal.id)}
        title="Eliminar búsqueda"
        message={`Se eliminará la búsqueda "${
          modal.type === "confirm-search" ? searches.find((s) => s.id === modal.id)?.name : ""
        }" y todas sus postulaciones asociadas. Esta acción no se puede deshacer.`}
      />

      <ConfirmModal
        open={modal.type === "confirm-app"}
        onClose={closeModal}
        onConfirm={() => modal.type === "confirm-app" && deleteApp(modal.id)}
        title="Eliminar postulación"
        message={`Se eliminará la postulación de "${
          modal.type === "confirm-app" ? apps.find((a) => a.id === modal.id)?.company : ""
        }" junto con sus puntos de interés y su CV asociado.`}
      />

      <Toast message={toast} onDone={() => setToast(null)} />

      <LoginModal
        open={modal.type === "login"}
        onClose={closeModal}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onRecovery={handleRecovery}
        onGoogle={handleGoogle}
      />

      {/* footer hint */}
      <div
        className={cn(
          "pointer-events-none fixed right-4 bottom-4 hidden font-mono text-[10.5px] text-faint/70 xl:block",
        )}
      >
        prototipo · sin backend
      </div>
    </div>
  );
}
