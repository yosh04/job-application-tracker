import { useCallback, useEffect, useMemo, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { Overview } from "./components/Overview";
import { SearchDashboard } from "./components/SearchDashboard";
import { ApplicationView } from "./components/ApplicationView";
import { DeadlineAgenda } from "./components/DeadlineAgenda";
import { GlobalSearch } from "./components/GlobalSearch";
import { ApplicationModal, ConfirmModal, CVModal, MoveModal, SearchModal, Toast } from "./components/Modals";
import { LoginModal } from "./components/LoginModal";
import { Button, Icon } from "./components/ui";
import { SEED_APPLICATIONS, SEED_SEARCHES } from "./seed";
import { supabase, isSupabaseConfigured } from "./lib/supabaseClient";
import * as db from "./lib/db";
import { deleteCv, deleteEvidence, EVIDENCE_MAX_BYTES, isStorageEvidencePath, uploadEvidence } from "./lib/storage";
import { applicationArchiveFilename, buildApplicationArchive } from "./lib/applicationExport";
import { initialApplicationActivity, mergeActivityEntries, recordApplicationChanges } from "./lib/applicationActivity";
import { importSeeds } from "./lib/seedMigrate";
import { todayISO, uid, MAX_EVIDENCE_IMAGES, type Application, type InterestPoint, type Search, type Status, type View } from "./types";

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
  // Seeds are the prototype fallback only; a configured backend starts empty
  // until the workspace loads (empty workspace shows the empty overview, not seeds).
  const [searches, setSearches] = useState<Search[]>(() => (isSupabaseConfigured ? [] : SEED_SEARCHES));
  const [apps, setApps] = useState<Application[]>(() => (isSupabaseConfigured ? [] : SEED_APPLICATIONS));
  const [view, setView] = useState<View>({ type: "overview" });
  const seedExpanded: Record<string, boolean> = { s_frontend: true, s_backend: true, s_remoto: true };
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    isSupabaseConfigured ? {} : seedExpanded,
  );
  const [drawer, setDrawer] = useState(false);
  const [modal, setModal] = useState<ModalState>({ type: null });
  const [toast, setToast] = useState<string | null>(null);
  const [user, setUser] = useState<string | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [importingSeeds, setImportingSeeds] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [exportingApplicationId, setExportingApplicationId] = useState<string | null>(null);

  const closeModal = useCallback(() => setModal({ type: null }), []);
  const closeGlobalSearch = useCallback(() => setGlobalSearchOpen(false), []);
  const notify = useCallback((message: string) => setToast(message), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (modal.type === null && (!isSupabaseConfigured || user)) setGlobalSearchOpen(true);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [modal.type, user]);

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

  // Supabase persistence: load the user's workspace when a session starts.
  // No session (or signed out) -> empty workspace; seeds stay prototype-only.
  // Seed rows are never migrated automatically.
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    if (!user) {
      setSearches([]);
      setApps([]);
      setView({ type: "overview" });
      return;
    }
    let cancelled = false;
    setDbLoading(true);
    db.loadWorkspace()
      .then(({ searches: loaded, applications }) => {
        if (cancelled) return;
        setSearches(loaded);
        setApps(applications);
        setExpanded((e) => {
          const next = { ...e };
          for (const s of loaded) if (!(s.id in next)) next[s.id] = true;
          return next;
        });
        setView({ type: "overview" });
      })
      .catch((err) => {
        console.error("[db] loadWorkspace failed", err);
        notify("No se pudieron cargar tus datos");
      })
      .finally(() => {
        if (!cancelled) setDbLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, notify]);

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

  // One-shot seed import: explicit user action only, never automatic.
  // Reloads the workspace so ids come from the DB, then notifies counts.
  const handleImportSeeds = useCallback(async () => {
    if (importingSeeds) return;
    setImportingSeeds(true);
    try {
      const { searches: searchCount, applications: appCount } = await importSeeds();
      const { searches: loaded, applications } = await db.loadWorkspace();
      setSearches(loaded);
      setApps(applications);
      setExpanded((e) => {
        const next = { ...e };
        for (const s of loaded) if (!(s.id in next)) next[s.id] = true;
        return next;
      });
      setView({ type: "overview" });
      notify(`Datos de ejemplo importados: ${searchCount} búsquedas, ${appCount} postulaciones`);
    } catch (err) {
      console.error("[db] importSeeds failed", err);
      notify(err instanceof Error ? err.message : "No se pudieron importar los datos de ejemplo");
    } finally {
      setImportingSeeds(false);
    }
  }, [importingSeeds, notify]);

  const currentSearch = "searchId" in view ? searches.find((s) => s.id === view.searchId) : undefined;
  const currentApp = view.type === "application" ? apps.find((a) => a.id === view.id) : undefined;

  const exportApplication = async (application: Application, search: Search) => {
    if (exportingApplicationId) return;
    setExportingApplicationId(application.id);
    try {
      const { blob, warnings } = await buildApplicationArchive(application, search);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = applicationArchiveFilename(application);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      notify(
        warnings.length > 0
          ? "ZIP descargado, pero el CV asociado no estaba disponible para incluirlo."
          : "Expediente descargado",
      );
    } catch (err) {
      console.error("[export] application archive failed", err);
      notify(err instanceof Error ? err.message : "No se pudo descargar el expediente");
    } finally {
      setExportingApplicationId(null);
    }
  };

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

  // Prototype (no backend / no session): local uid() rows. With a session:
  // persist via db.ts and adopt the returned DB uuids as ids.
  const createSearch = async (data: { name: string; description: string }) => {
    if (!isSupabaseConfigured || !supabase || !user) {
      const search: Search = { id: uid("s"), name: data.name, description: data.description, createdAt: todayISO() };
      setSearches((s) => [...s, search]);
      setExpanded((e) => ({ ...e, [search.id]: true }));
      closeModal();
      setView({ type: "dashboard", searchId: search.id });
      notify(`Búsqueda "${search.name}" creada`);
      return;
    }
    try {
      const search = await db.createSearch(data);
      setSearches((s) => [...s, search]);
      setExpanded((e) => ({ ...e, [search.id]: true }));
      closeModal();
      setView({ type: "dashboard", searchId: search.id });
      notify(`Búsqueda "${search.name}" creada`);
    } catch (err) {
      console.error("[db] createSearch failed", err);
      notify("No se pudo crear la búsqueda");
    }
  };

  const updateSearch = async (id: string, data: { name: string; description: string }) => {
    if (!isSupabaseConfigured || !supabase || !user) {
      setSearches((s) => s.map((x) => (x.id === id ? { ...x, ...data } : x)));
      closeModal();
      notify("Búsqueda actualizada");
      return;
    }
    try {
      const saved = await db.updateSearch(id, data);
      setSearches((s) => s.map((x) => (x.id === id ? saved : x)));
      closeModal();
      notify("Búsqueda actualizada");
    } catch (err) {
      console.error("[db] updateSearch failed", err);
      notify("No se pudo actualizar la búsqueda");
    }
  };

  const deleteSearch = async (id: string) => {
    const name = searches.find((s) => s.id === id)?.name ?? "";
    if (isSupabaseConfigured && supabase && user) {
      try {
        await db.deleteSearch(id);
        // Cascade deletes the rows; clean their storage objects best-effort.
        const evidence = apps
          .filter((a) => a.searchId === id)
          .flatMap((a) => a.images ?? [])
          .filter(isStorageEvidencePath);
        if (evidence.length > 0) {
          deleteEvidence(evidence).catch((err) => console.error("[storage] deleteEvidence failed", err));
        }
        const cvs = apps
          .filter((a) => a.searchId === id)
          .map((a) => a.cv?.path)
          .filter((p): p is string => !!p);
        if (cvs.length > 0) {
          deleteCv(cvs).catch((err) => console.error("[storage] deleteCv failed", err));
        }
      } catch (err) {
        console.error("[db] deleteSearch failed", err);
        notify("No se pudo eliminar la búsqueda");
        return;
      }
    }
    setSearches((s) => s.filter((x) => x.id !== id));
    setApps((a) => a.filter((x) => x.searchId !== id));
    closeModal();
    setView({ type: "overview" });
    notify(`Búsqueda "${name}" eliminada`);
  };

  // Evidence storage cleanup: images[] entries that are Storage paths
  // (see storage.ts) removed from the row should not orphan their objects.
  // Best-effort only: failures log and never block the UI update.
  const cleanupRemovedEvidence = (prevImages: string[] | undefined, nextImages: string[]) => {
    if (!isSupabaseConfigured || !supabase || !user) return;
    const next = new Set(nextImages);
    const removed = (prevImages ?? []).filter((v) => isStorageEvidencePath(v) && !next.has(v));
    if (removed.length > 0) {
      deleteEvidence(removed).catch((err) => console.error("[storage] deleteEvidence failed", err));
    }
  };

  // Optimistic update keeps the UI snappy; reconcile with the DB row when persisted.
  const patchApp = (id: string, patch: Partial<Application>) => {
    const prev = apps.find((a) => a.id === id);
    const next = prev
      ? recordApplicationChanges(prev, { ...prev, ...patch, updatedAt: todayISO() })
      : undefined;
    const existingEvents = prev?.activity?.length ?? 0;
    const activityEntries = next?.activity?.slice(existingEvents) ?? [];
    const persistedPatch = {
      ...patch,
      ...(activityEntries.length > 0 ? { activity: activityEntries } : {}),
    };
    setApps((list) => list.map((a) => (a.id === id && next ? next : a)));
    if (isSupabaseConfigured && supabase && user) {
      if (patch.images !== undefined) cleanupRemovedEvidence(prev?.images, patch.images);
      db.patchApplication(id, persistedPatch)
        .then((saved) =>
          setApps((list) =>
            list.map((a) =>
              a.id === id
                ? { ...saved, activity: mergeActivityEntries(a.activity ?? [], saved.activity ?? []) }
                : a,
            ),
          ),
        )
        .catch((err) => {
          console.error("[db] patchApplication failed", err);
          notify("No se pudo guardar el cambio");
        });
    }
  };

  type ApplicationSave = Omit<Application, "id" | "createdAt" | "updatedAt" | "activity"> & { newImageFiles?: File[] };

  // Uploads staged evidence files into the application folder and returns
  // the storage paths. Per-file failures notify inline and skip that file.
  const uploadStagedEvidence = async (userId: string, appId: string, files: File[]): Promise<string[]> => {
    const paths: string[] = [];
    for (const file of files) {
      try {
        paths.push(await uploadEvidence(userId, appId, file));
      } catch (err) {
        console.error("[storage] uploadEvidence failed", err);
        notify(err instanceof Error ? err.message : "No se pudo subir una imagen");
      }
    }
    return paths;
  };

  const addApplicationEvidence = async (application: Application, files: File[]) => {
    const remaining = MAX_EVIDENCE_IMAGES - (application.images?.length ?? 0);
    if (remaining <= 0) {
      notify(`Puedes adjuntar hasta ${MAX_EVIDENCE_IMAGES} imágenes por postulación`);
      return;
    }
    const selected = files.slice(0, remaining);
    const rejected: string[] = [];
    const valid: File[] = [];
    for (const file of selected) {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!["png", "jpg", "jpeg", "webp", "gif"].includes(extension) || (file.type && !file.type.startsWith("image/"))) {
        rejected.push(`${file.name}: formato no permitido`);
      } else if (!file.size || file.size > EVIDENCE_MAX_BYTES) {
        rejected.push(`${file.name}: el tamaño debe ser de hasta 5 MB`);
      } else {
        valid.push(file);
      }
    }
    if (files.length > selected.length) {
      rejected.push(`Solo se pueden adjuntar ${remaining} imagen(es) más a esta postulación`);
    }
    if (valid.length === 0) {
      if (rejected.length > 0) notify(rejected.join(". "));
      return;
    }

    if (isSupabaseConfigured && supabase) {
      const uploaded: string[] = [];
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        const userId = data.user?.id;
        if (!userId) throw new Error("Inicia sesión para adjuntar imágenes.");
        for (const file of valid) {
          try {
            uploaded.push(await uploadEvidence(userId, application.id, file));
          } catch (error) {
            console.error("[storage] uploadEvidence failed", error);
            rejected.push(`${file.name}: ${error instanceof Error ? error.message : "no se pudo subir"}`);
          }
        }
      } catch (error) {
        console.error("[evidence] upload failed", error);
        rejected.push(error instanceof Error ? error.message : "No se pudieron subir las imágenes");
      }
      if (uploaded.length > 0) patchApp(application.id, { images: [...(application.images ?? []), ...uploaded] });
      if (uploaded.length > 0 || rejected.length > 0) {
        notify([
          uploaded.length > 0 ? `Se agregaron ${uploaded.length} imagen(es)` : "",
          rejected.length > 0 ? `Algunos archivos no se agregaron: ${rejected.join(". ")}` : "",
        ].filter(Boolean).join(". "));
      }
      return;
    }

    const dataUrls: string[] = [];
    for (const file of valid) {
      try {
        dataUrls.push(await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("No se pudo leer el archivo."));
          reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer el archivo."));
          reader.readAsDataURL(file);
        }));
      } catch (error) {
        console.error("[evidence] local image read failed", error);
        rejected.push(`${file.name}: no se pudo leer`);
      }
    }
    if (dataUrls.length > 0) {
      patchApp(application.id, { images: [...(application.images ?? []), ...dataUrls] });
    }
    if (dataUrls.length > 0 || rejected.length > 0) {
      notify([
        dataUrls.length > 0 ? `Se agregaron ${dataUrls.length} imagen(es)` : "",
        rejected.length > 0 ? `Algunos archivos no se agregaron: ${rejected.join(". ")}` : "",
      ].filter(Boolean).join(". "));
    }
  };

  const saveApplication = async (data: ApplicationSave) => {
    const { newImageFiles, ...rest } = data;
    const persisted = isSupabaseConfigured && !!supabase && !!user;
    if (modal.type === "application" && modal.editing) {
      const id = modal.editing.id;
      const previous = apps.find((app) => app.id === id) ?? modal.editing;
      const prevImages = previous.images ?? [];
      if (!persisted) {
        const next = recordApplicationChanges(previous, { ...previous, ...rest, updatedAt: todayISO() });
        setApps((list) => list.map((a) => (a.id === id ? next : a)));
        closeModal();
        notify("Postulación actualizada");
        return;
      }
      try {
        // Defensive: the modal uploads on select when editing, but staged
        // files are still honored here so none are silently dropped.
        let images = [...(rest.images ?? [])];
        if (newImageFiles?.length && supabase) {
          const { data: session } = await supabase.auth.getUser();
          const userId = session.user?.id;
          if (!userId) throw new Error("No active session.");
          images = [...images, ...(await uploadStagedEvidence(userId, id, newImageFiles))];
        }
        const next = recordApplicationChanges(previous, { ...previous, ...rest, images, updatedAt: todayISO() });
        const existingEvents = previous.activity?.length ?? 0;
        const activityEntries = next.activity?.slice(existingEvents) ?? [];
        const saved = await db.updateApplication(id, { ...rest, images, activity: activityEntries });
        cleanupRemovedEvidence(prevImages, images);
        setApps((list) => list.map((a) => (a.id === id ? saved : a)));
        closeModal();
        notify("Postulación actualizada");
      } catch (err) {
        console.error("[db] updateApplication failed", err);
        notify("No se pudo actualizar la postulación");
      }
      return;
    }
    if (!persisted) {
      const app: Application = {
        ...rest,
        id: uid("a"),
        createdAt: todayISO(),
        updatedAt: todayISO(),
        activity: initialApplicationActivity(rest.status),
      };
      setApps((list) => [app, ...list]);
      setExpanded((e) => ({ ...e, [app.searchId]: true }));
      closeModal();
      setView({ type: "application", id: app.id });
      notify(`Postulación de ${app.company} creada`);
      return;
    }
    try {
      // The row must exist first: Storage paths embed the applicationId.
      const app = await db.createApplication({
        ...rest,
        images: rest.images ?? [],
        activity: initialApplicationActivity(rest.status),
      });
      let finalApp = app;
      if (newImageFiles?.length && supabase) {
        const { data: session } = await supabase.auth.getUser();
        const userId = session.user?.id;
        if (!userId) throw new Error("No active session.");
        const paths = await uploadStagedEvidence(userId, app.id, newImageFiles);
        if (paths.length > 0) {
          finalApp = await db.patchApplication(app.id, { images: [...app.images, ...paths] });
        }
        if (paths.length < newImageFiles.length) {
          notify(`Postulación creada, pero ${newImageFiles.length - paths.length} imagen(es) no se pudieron subir`);
        }
      }
      setApps((list) => [finalApp, ...list]);
      setExpanded((e) => ({ ...e, [finalApp.searchId]: true }));
      closeModal();
      setView({ type: "application", id: finalApp.id });
      notify(`Postulación de ${finalApp.company} creada`);
    } catch (err) {
      console.error("[db] createApplication failed", err);
      notify("No se pudo crear la postulación");
    }
  };

  const duplicateApp = async (id: string) => {
    const source = apps.find((a) => a.id === id);
    if (!source) return;
    if (!isSupabaseConfigured || !supabase || !user) {
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
      return;
    }
    try {
      const copy = await db.duplicateApplication(source);
      setApps((list) => [copy, ...list]);
      notify("Postulación duplicada");
    } catch (err) {
      console.error("[db] duplicateApplication failed", err);
      notify("No se pudo duplicar la postulación");
    }
  };

  const moveApp = async (appId: string, targetId: string, newSearchName?: string) => {
    const app = apps.find((a) => a.id === appId);
    if (!app) return;
    const persisted = isSupabaseConfigured && !!supabase && !!user;
    try {
      let finalTarget = targetId;
      let targetName = searches.find((s) => s.id === targetId)?.name ?? "";

      if (targetId === "__new__") {
        const name = newSearchName?.trim() || "Nueva búsqueda";
        if (persisted) {
          const created = await db.createSearch({ name, description: "" });
          setSearches((s) => [...s, created]);
          finalTarget = created.id;
          targetName = created.name;
        } else {
          const created: Search = {
            id: uid("s"),
            name,
            description: "",
            createdAt: todayISO(),
          };
          setSearches((s) => [...s, created]);
          finalTarget = created.id;
          targetName = created.name;
        }
        setExpanded((e) => ({ ...e, [finalTarget]: true }));
      }

      // Storage paths embed the applicationId (not the searchId), so moving
      // across searches keeps every evidence/CV object valid — no file work.
      const moved = recordApplicationChanges(app, {
        ...app,
        searchId: finalTarget,
        updatedAt: todayISO(),
      });
      if (persisted) {
        await db.patchApplication(appId, {
          searchId: finalTarget,
          activity: moved.activity?.slice(app.activity?.length ?? 0) ?? [],
        });
      }
      setApps((list) => list.map((a) => (a.id === appId ? moved : a)));
      setExpanded((e) => ({ ...e, [finalTarget]: true }));
      closeModal();
      if (view.type === "application") setView({ type: "dashboard", searchId: finalTarget });
      notify(`${app.company} movida a "${targetName}"`);
    } catch (err) {
      console.error("[db] moveApplication failed", err);
      notify("No se pudo mover la postulación");
    }
  };

  const deleteApp = async (id: string) => {
    const app = apps.find((a) => a.id === id);
    if (isSupabaseConfigured && supabase && user) {
      try {
        await db.deleteApplication(id);
        // Best-effort storage cleanup so deleting the row orphans no objects.
        const evidence = (app?.images ?? []).filter(isStorageEvidencePath);
        if (evidence.length > 0) {
          deleteEvidence(evidence).catch((err) => console.error("[storage] deleteEvidence failed", err));
        }
        if (app?.cv?.path) {
          deleteCv([app.cv.path]).catch((err) => console.error("[storage] deleteCv failed", err));
        }
      } catch (err) {
        console.error("[db] deleteApplication failed", err);
        notify("No se pudo eliminar la postulación");
        return;
      }
    }
    setApps((list) => list.filter((a) => a.id !== id));
    closeModal();
    const searchId = app?.searchId;
    setView(searchId ? { type: "dashboard", searchId } : { type: "overview" });
    notify(`Postulación de ${app?.company} eliminada`);
  };

  const pointHandlers = {
    onAddPoint: async (title: string, content: string) => {
      if (!currentApp) return;
      const point: InterestPoint = { id: uid("p"), title, content };
      patchApp(currentApp.id, { points: [...currentApp.points, point] });
      notify("Punto de interés agregado");
    },
    onSavePoint: async (pointId: string, title: string, content: string) => {
      if (!currentApp) return;
      patchApp(currentApp.id, {
        points: currentApp.points.map((point) => (point.id === pointId ? { ...point, title, content } : point)),
      });
      notify("Punto actualizado");
    },
    onDeletePoint: async (pointId: string) => {
      if (!currentApp) return;
      patchApp(currentApp.id, { points: currentApp.points.filter((point) => point.id !== pointId) });
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
      : view.type === "agenda"
        ? "Agenda de vencimientos"
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
      onAgenda={() => {
        setView({ type: "agenda" });
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
        <header className="relative flex h-auto shrink-0 flex-col items-stretch gap-0 border-b border-line bg-surface/80 px-4 pt-1 pb-2 backdrop-blur sm:h-14 sm:flex-row sm:items-center sm:gap-3 sm:px-5 sm:py-0">
          <div className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-brand/45 to-transparent" />
          <div className="flex h-12 w-full shrink-0 items-center gap-3 sm:h-full sm:flex-1">
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

            <div className="flex min-w-0 flex-1 items-center gap-2 lg:hidden">
              <span className="shrink-0 text-[13.5px] font-medium text-ink">JobTrack</span>
              <span className="truncate text-[12px] text-faint max-sm:hidden">{breadcrumb}</span>
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              <button
                onClick={() => setGlobalSearchOpen(true)}
                className="flex h-8.5 items-center gap-2 rounded-md border border-line bg-base/60 px-2.5 text-[12.5px] text-faint transition-colors hover:border-brand/50 hover:text-muted"
                aria-label="Abrir búsqueda global"
              >
                <Icon name="search" className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Buscar postulaciones…</span>
                <span className="rounded border border-line2 px-1 font-mono text-[10px]">⌘K</span>
              </button>

              {user ? (
                <div className="flex shrink-0 items-center">
                  <button
                    onClick={handleSignOut}
                    className="inline-flex h-9 items-center justify-center rounded-md border border-line bg-panel px-3 text-[12.5px] font-medium text-ink transition-colors hover:border-line2 hover:bg-elev focus-visible:outline-offset-2"
                  >
                    Salir
                  </button>
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  className="hidden h-9 px-3 text-[12.5px] sm:inline-flex"
                  onClick={() => setModal({ type: "login" })}
                >
                  Iniciar sesión
                </Button>
              )}
            </div>
          </div>

        </header>

        {/* main */}
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="pointer-events-none fixed inset-x-0 top-0 h-64 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(59,130,246,0.07),transparent_70%)]" />

          {dbLoading ? (
            <div className="p-10 text-center text-muted">Cargando tus datos…</div>
          ) : (
            <>
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
              {isSupabaseConfigured && user && searches.length === 0 && (
                <div className="mx-4 mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-line2 bg-surface/40 px-4 py-3 text-[13px] text-muted sm:mx-5">
                  <span>Tu cuenta está vacía. Puedes empezar con los datos de ejemplo del prototipo.</span>
                  <Button variant="outline" size="sm" onClick={handleImportSeeds} disabled={importingSeeds}>
                    {importingSeeds ? "Importando…" : "Importar datos de ejemplo"}
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
                onOpenAgenda={() => setView({ type: "agenda" })}
              />
            </>
          )}

          {!locked && view.type === "agenda" && (
            <DeadlineAgenda
              applications={apps}
              searches={searches}
              onOpenApplication={openApp}
            />
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
                onEdit={(id) => {
                  const application = apps.find((item) => item.id === id);
                  if (application) setModal({ type: "application", editing: application });
                }}
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
                onExportArchive={() => void exportApplication(currentApp, searches.find((s) => s.id === currentApp.searchId)!)}
                exportingArchive={exportingApplicationId === currentApp.id}
                onAddEvidenceFiles={(files) => addApplicationEvidence(currentApp, files)}
                onRemoveCv={() => {
                  const path = currentApp.cv?.path;
                  patchApp(currentApp.id, { cv: null });
                  // Best-effort storage cleanup so removing the CV does not orphan the object.
                  if (isSupabaseConfigured && path) {
                    deleteCv([path]).catch((err) => console.error("[storage] deleteCv failed", err));
                  }
                  notify("CV quitado de la postulación");
                }}
                onPatch={(patch) => patchApp(currentApp.id, patch)}
                {...pointHandlers}
              />
            ) : (
              <div className="p-10 text-center text-muted">Esta postulación ya no existe.</div>
            ))}
            </>
          )}
        </main>
      </div>

      {/* modals */}
      <SearchModal
        open={modal.type === "search"}
        onClose={closeModal}
        editing={modal.type === "search" ? modal.editing : undefined}
        onSave={(data) => (modal.type === "search" && modal.editing ? updateSearch(modal.editing.id, data) : createSearch(data))}
      />

      <GlobalSearch
        open={globalSearchOpen}
        applications={apps}
        searches={searches}
        requiresLogin={locked}
        onClose={closeGlobalSearch}
        onOpenApplication={openApp}
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
      {!isSupabaseConfigured && (
        <div className="pointer-events-none fixed right-4 bottom-4 hidden font-mono text-[10.5px] text-faint/70 xl:block">
          prototipo · sin backend
        </div>
      )}
    </div>
  );
}
