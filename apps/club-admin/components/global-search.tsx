"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SearchIcon, User, LayoutDashboard, Calendar, Users, CreditCard, BarChart3, Settings, HelpCircle, Activity, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase-client";

// ─── Nav pages ────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { href: '/dashboard',           label: 'Dashboard',        icon: <LayoutDashboard size={15} /> },
  { href: '/analytics',           label: 'Analytics',        icon: <BarChart3 size={15} /> },
  { href: '/roster',              label: 'Weekly Roster',    icon: <Calendar size={15} /> },
  { href: '/caddies',             label: 'Caddie Profiles',  icon: <Users size={15} /> },
  { href: '/caddies?register=true', label: 'Register Caddie', icon: <Plus size={15} /> },
  { href: '/payments',            label: 'Payments',         icon: <CreditCard size={15} /> },
  { href: '/settings',            label: 'Settings',         icon: <Settings size={15} /> },
  { href: '/support',             label: 'Help & Support',   icon: <HelpCircle size={15} /> },
  { href: '/status',              label: 'Platform Status',  icon: <Activity size={15} /> },
];

type Caddie = { id: string; name: string; phone: string };

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const router = useRouter();
  const supabase = createClient();

  const [query, setQuery] = React.useState("");
  const [caddies, setCaddies] = React.useState<Caddie[]>([]);
  const [caddieLoading, setCaddieLoading] = React.useState(false);

  // ── Keyboard shortcut Ctrl/Cmd+K ─────────────────────────────────────────
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onOpenChange]);

  // ── Reset when closed ─────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setCaddies([]);
    }
  }, [open]);

  // ── Live caddie search ─────────────────────────────────────────────────────
  React.useEffect(() => {
    if (query.trim().length < 2) {
      setCaddies([]);
      return;
    }

    let cancelled = false;
    setCaddieLoading(true);

    const run = async () => {
      // First get club_id for the current admin
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data: adminData } = await supabase
        .from("club_admins")
        .select("club_id")
        .eq("user_id", user.id)
        .single();

      if (!adminData || cancelled) { setCaddieLoading(false); return; }

      const { data } = await supabase
        .from("caddies")
        .select("id, name, phone")
        .eq("club_id", adminData.club_id)
        .ilike("name", `%${query.trim()}%`)
        .order("name")
        .limit(8);

      if (!cancelled) {
        setCaddies(data ?? []);
        setCaddieLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [query]);

  // ── Filtered nav items ─────────────────────────────────────────────────────
  const filteredNav = React.useMemo(
    () =>
      query.trim().length === 0
        ? NAV_ITEMS                                           // show all when empty
        : NAV_ITEMS.filter((item) =>
            item.label.toLowerCase().includes(query.toLowerCase())
          ),
    [query]
  );

  const navigate = (href: string) => {
    router.push(href);
    onOpenChange(false);
  };

  const hasResults = filteredNav.length > 0 || caddies.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden border-none ring-0 focus:ring-0 outline-none">
        <DialogHeader className="sr-only">
          <DialogTitle>Search</DialogTitle>
        </DialogHeader>

        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
          <SearchIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <input
            autoFocus
            placeholder="Search pages or caddies…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-xs text-muted-foreground hover:text-foreground px-1"
            >
              Clear
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-[420px] overflow-y-auto">
          {/* ── Pages section ───────────────────────────────────────── */}
          {filteredNav.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Pages
              </p>
              {filteredNav.map((item) => (
                <button
                  key={item.href}
                  onClick={() => navigate(item.href)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors group"
                >
                  <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    {item.icon}
                  </span>
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* ── Caddies section ──────────────────────────────────────── */}
          {query.trim().length >= 2 && (
            <div>
              <p className="px-4 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Caddies
              </p>

              {caddieLoading ? (
                <div className="px-4 py-3 text-sm text-muted-foreground">Searching…</div>
              ) : caddies.length === 0 ? (
                <div className="px-4 py-3 text-sm text-muted-foreground">No caddies match &quot;{query}&quot;</div>
              ) : (
                caddies.map((caddie) => (
                  <div
                    key={caddie.id}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors"
                  >
                    {/* Avatar */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">
                        {caddie.name.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    {/* Name + phone */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{caddie.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{caddie.phone}</p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => navigate(`/caddies?search=${encodeURIComponent(caddie.name)}`)}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                        title="Open caddie profile"
                      >
                        Profile
                      </button>
                      <button
                        onClick={() => navigate(`/roster?search=${encodeURIComponent(caddie.name)}`)}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-muted text-muted-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors"
                        title="View on roster"
                      >
                        Roster
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Empty state ───────────────────────────────────────────── */}
          {!hasResults && query.trim().length > 0 && (
            <div className="px-4 py-10 text-center">
              <User className="mx-auto mb-2 text-muted-foreground/40" size={32} />
              <p className="text-sm text-muted-foreground">No results for &quot;{query}&quot;</p>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t border-border px-4 py-2 flex items-center gap-3 text-[10px] text-muted-foreground">
          <span><kbd className="font-mono bg-muted px-1 py-0.5 rounded text-[10px]">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono bg-muted px-1 py-0.5 rounded text-[10px]">↵</kbd> select</span>
          <span><kbd className="font-mono bg-muted px-1 py-0.5 rounded text-[10px]">Esc</kbd> close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
