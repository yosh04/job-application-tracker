import { cn } from "../utils/cn";
import { Icon, IconButton, Dropdown, MenuItem, MenuSeparator, StatusDot } from "./ui";
import type { Application, Search, View } from "../types";

export function Sidebar({
  searches,
  applications,
  view,
  expanded,
  onToggle,
  onSelectSearch,
  onSelectApplication,
  onOverview,
  onNewSearch,
  onRenameSearch,
  onDeleteSearch,
  onNewApplication,
  onClose,
}: {
  searches: Search[];
  applications: Application[];
  view: View;
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
  onSelectSearch: (id: string) => void;
  onSelectApplication: (id: string) => void;
  onOverview: () => void;
  onNewSearch: () => void;
  onRenameSearch: (id: string) => void;
  onDeleteSearch: (id: string) => void;
  onNewApplication: (searchId: string) => void;
  onClose?: () => void;
}) {
  const activeSearchId = view.type !== "overview" ? ("searchId" in view ? view.searchId : undefined) : undefined;
  const activeAppId = view.type === "application" ? view.id : undefined;

  const activeApp = activeAppId ? applications.find((a) => a.id === activeAppId) : undefined;
  const effectiveSearchId = activeSearchId ?? activeApp?.searchId;

  return (
    <aside className="flex h-full w-[268px] shrink-0 flex-col border-r border-line bg-surface">
      {/* brand */}
      <div className="flex h-14 items-center gap-2.5 border-b border-line px-4">
        <div className="relative flex h-7.5 w-7.5 items-center justify-center rounded-[7px] bg-brand shadow-[0_0_20px_-4px_rgba(59,130,246,0.9)]">
          <div className="h-3 w-[3px] rounded-full bg-white/95" />
          <div className="absolute h-[3px] w-1.5 rounded-full bg-white/95" style={{ left: 7, top: 9 }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] leading-none font-semibold tracking-tight text-ink">JobTrack</p>
          <p className="mt-1 truncate text-[10.5px] tracking-wide text-faint">CONTROL DE POSTULACIONES</p>
        </div>
        {onClose && (
          <IconButton label="Cerrar menú" onClick={onClose} className="lg:hidden">
            <Icon name="x" />
          </IconButton>
        )}
      </div>

      {/* new search */}
      <div className="p-3">
        <button
          onClick={onNewSearch}
          className="group flex w-full items-center gap-2 rounded-md border border-brand/30 bg-brand/10 px-3 py-2.5 text-[13px] font-medium text-brand-soft transition-all hover:border-brand/55 hover:bg-brand/18 hover:text-white"
        >
          <Icon name="plus" className="h-4 w-4 transition-transform group-hover:scale-110" strokeWidth={2} />
          Nueva búsqueda
        </button>
      </div>

      {/* nav */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <button
          onClick={onOverview}
          className={cn(
            "mb-4 flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors",
            view.type === "overview" ? "bg-elev2 text-ink" : "text-muted hover:bg-white/5 hover:text-ink",
          )}
        >
          <Icon name="grid" className={cn("h-4 w-4", view.type === "overview" ? "text-brand" : "text-faint")} />
          Resumen general
        </button>

        <p className="mb-1.5 flex items-center justify-between px-2.5 text-[10.5px] font-semibold tracking-[0.16em] text-faint uppercase">
          Búsquedas
          <span className="font-mono text-[10px] tracking-normal">{searches.length}</span>
        </p>

        <div className="space-y-0.5">
          {searches.map((search) => {
            const apps = applications.filter((a) => a.searchId === search.id);
            const isOpen = !!expanded[search.id];
            const isActive = effectiveSearchId === search.id;

            return (
              <div key={search.id}>
                <div
                  className={cn(
                    "group flex items-center gap-1 rounded-md pr-1 transition-colors",
                    isActive && !activeAppId ? "bg-elev2" : "hover:bg-white/4",
                  )}
                >
                  <button
                    onClick={() => onToggle(search.id)}
                    className="flex h-8 w-5 shrink-0 items-center justify-center text-faint hover:text-ink"
                    aria-label={isOpen ? "Colapsar" : "Expandir"}
                  >
                    <Icon
                      name="caret"
                      className={cn("h-3.5 w-3.5 transition-transform duration-150", !isOpen && "-rotate-90")}
                      strokeWidth={2}
                    />
                  </button>
                  <button
                    onClick={() => onSelectSearch(search.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left"
                  >
                    <Icon
                      name="folder"
                      className={cn("h-4 w-4", isActive ? "text-brand" : "text-faint group-hover:text-muted")}
                    />
                    <span
                      className={cn(
                        "truncate text-[13px]",
                        isActive ? "font-medium text-ink" : "text-muted group-hover:text-ink",
                      )}
                    >
                      {search.name}
                    </span>
                  </button>
                  <span className="font-mono text-[10.5px] text-faint">{apps.length}</span>
                  <Dropdown
                    width="w-44"
                    trigger={(open) => (
                      <span
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded text-faint transition-opacity hover:bg-white/8 hover:text-ink",
                          open ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                        )}
                      >
                        <Icon name="dots" className="h-4 w-4" />
                      </span>
                    )}
                  >
                    {(close) => (
                      <>
                        <MenuItem
                          icon="plus"
                          onClick={() => {
                            close();
                            onNewApplication(search.id);
                          }}
                        >
                          Nueva postulación
                        </MenuItem>
                        <MenuItem
                          icon="pencil"
                          onClick={() => {
                            close();
                            onRenameSearch(search.id);
                          }}
                        >
                          Renombrar
                        </MenuItem>
                        <MenuSeparator />
                        <MenuItem
                          icon="trash"
                          danger
                          onClick={() => {
                            close();
                            onDeleteSearch(search.id);
                          }}
                        >
                          Eliminar búsqueda
                        </MenuItem>
                      </>
                    )}
                  </Dropdown>
                </div>

                {isOpen && (
                  <div className="relative mt-0.5 mb-1 ml-[19px] space-y-px border-l border-line pl-2.5">
                    {apps.length === 0 && (
                      <p className="px-2 py-1.5 text-[12px] text-faint italic">Sin postulaciones</p>
                    )}
                    {apps.map((app) => {
                      const selected = activeAppId === app.id;
                      return (
                        <button
                          key={app.id}
                          onClick={() => onSelectApplication(app.id)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-[6px] px-2 py-[7px] text-left transition-colors",
                            selected ? "bg-brand/14 text-ink" : "text-muted hover:bg-white/5 hover:text-ink",
                          )}
                        >
                          <StatusDot status={app.status} className="h-1.5 w-1.5" />
                          <span className="truncate text-[12.5px]">{app.company}</span>
                          {selected && <Icon name="chevron" className="ml-auto h-3 w-3 text-brand" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* footer */}
      <div className="border-t border-line px-4 py-3">
        <div className="flex items-center gap-2 text-[11.5px] text-faint">
          <Icon name="layers" className="h-3.5 w-3.5" />
          <span>
            {applications.length} postulaciones · {searches.length} búsquedas
          </span>
        </div>
      </div>
    </aside>
  );
}
