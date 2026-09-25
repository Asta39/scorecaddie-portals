"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  SearchIcon, LayoutDashboard, Building2, Users, Shield, BarChart3, CreditCard, Flag, Settings, Plus, User,
} from "lucide-react";
import { createClient } from "@/lib/supabase-client";

// Mirrors the club-admin portal's search, scoped to the whole platform.

const NAV_ITEMS = [
  { href: "/dashboard",     label: "Dashboard",  icon: <LayoutDashboard size={15} /> },
  { href: "/clubs",         label: "Clubs",      icon: <Building2 size={15} /> },
  { href: "/clubs?new=1",   label: "Add Club",   icon: <Plus size={15} /> },
  { href: "/caddies",       label: "Caddies",    icon: <Users size={15} /> },
  { href: "/admins",        label: "Admins",     icon: <Shield size={15} /> },
  { href: "/analytics",     label: "Analytics",  icon: <BarChart3 size={15} /> },
  { href: "/payments",      label: "Payments",   icon: <CreditCard size={15} /> },
  { href: "/flags",         label: "Flags",      icon: <Flag size={15} /> },
  { href: "/config",        label: "Config",     icon: <Settings size={15} /> },
];

type Club = { id: string; name: string; location: string | null };
type Caddie = { id: string; name: string; phone: string; club_id: string };

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const router = useRouter();
  const supabase = createClient();

  const [query, setQuery] = React.useState("");
  const [clubs, setClubs] = React.useState<Club[]>([]);
  const [caddies, setCaddies] = React.useState<Caddie[]>([]);
  const [searching, setSearching] = React.useState(false);

  // Ctrl/Cmd+K
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

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setClubs([]);
      setCaddies([]);
    }
  }, [open]);

  React.useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setClubs([]);
      setCaddies([]);
      return;
    }

    let cancelled = false;
    setSearching(true);

    // Short debounce so each keystroke doesn't fire two queries.
    const timer = setTimeout(async () => {
      const [clubsRes, caddiesRes] = await Promise.all([
        supabase.from("clubs").select("id, name, location").ilike("name", `%${q}%`).order("name").limit(5),
        supabase.from("caddies").select("id, name, phone, club_id").ilike("name", `%${q}%`).order("name").limit(8),
      ]);
      if (cancelled) return;
      setClubs(clubsRes.data ?? []);
      setCaddies(caddiesRes.data ?? []);
      setSearching(false);
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const filteredNav = React.useMemo(
    () =>
      query.trim().length === 0
        ? NAV_ITEMS
        : NAV_ITEMS.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())),
    [query]
  );

  const navigate = (href: string) => {
    router.push(href);
    onOpenChange(false);
  };

  const searched = query.trim().length >= 2;
  const hasResults = filteredNav.length > 0 || clubs.length > 0 || caddies.length > 0;

  const sectionLabel = (text: string) => (
    <p className="px-4 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
      {text}
    </p>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden border-none sm:rounded-xl [&>button]:hidden outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Search</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
          <SearchIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <input
            autoFocus
            placeholder="Search pages, clubs or caddies…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none focus:outline-none focus:ring-0 border-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-xs text-muted-foreground hover:text-foreground px-1">
              Clear
            </button>
          )}
        </div>

        <div className="max-h-[420px] overflow-y-auto">
          {filteredNav.length > 0 && (
            <div>
              {sectionLabel("Pages")}
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

          {searched && (
            <div>
              {sectionLabel("Clubs")}
              {searching ? (
                <div className="px-4 py-3 text-sm text-muted-foreground">Searching…</div>
              ) : clubs.length === 0 ? (
                <div className="px-4 py-3 text-sm text-muted-foreground">No clubs match &quot;{query}&quot;</div>
              ) : (
                clubs.map((club) => (
                  <button
                    key={club.id}
                    onClick={() => navigate(`/clubs/${club.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">{club.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{club.name}</p>
                      {club.location && <p className="text-xs text-muted-foreground truncate">{club.location}</p>}
                    </div>
                  </button>
                ))
              )}

              {sectionLabel("Caddies")}
              {searching ? (
                <div className="px-4 py-3 text-sm text-muted-foreground">Searching…</div>
              ) : caddies.length === 0 ? (
                <div className="px-4 py-3 text-sm text-muted-foreground">No caddies match &quot;{query}&quot;</div>
              ) : (
                caddies.map((caddie) => (
                  <button
                    key={caddie.id}
                    onClick={() => navigate(`/caddies?club=${caddie.club_id}`)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">{caddie.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{caddie.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{caddie.phone}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {!hasResults && !searched && query.trim().length > 0 && (
            <div className="px-4 py-10 text-center">
              <User className="mx-auto mb-2 text-muted-foreground/40" size={32} />
              <p className="text-sm text-muted-foreground">No results for &quot;{query}&quot;</p>
            </div>
          )}
        </div>

        <div className="border-t border-border px-4 py-2 flex items-center gap-3 text-[10px] text-muted-foreground">
          <span><kbd className="font-mono bg-muted px-1 py-0.5 rounded text-[10px]">⌘K</kbd> open</span>
          <span><kbd className="font-mono bg-muted px-1 py-0.5 rounded text-[10px]">Esc</kbd> close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
