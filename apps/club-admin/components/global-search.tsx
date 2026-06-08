"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty } from "@/components/ui/command";
import { SearchIcon } from "lucide-react";

// Searchable pages — must match actual routes in app/(dashboard)
const items = [
  { href: '/dashboard',  label: 'Dashboard' },
  { href: '/analytics',  label: 'Analytics' },
  { href: '/roster',     label: 'Weekly Roster' },
  { href: '/caddies',    label: 'Caddie Profiles' },
  { href: '/caddies?register=true', label: 'Register Caddie' },
  { href: '/payments',   label: 'Payments' },
  { href: '/settings',   label: 'Settings' },
  { href: '/support',    label: 'Help & Support' },
  { href: '/status',     label: 'Platform Status' },
]
;

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  // Register keyboard shortcut Cmd/Ctrl+K to open the search dialog
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(
    () =>
      items.filter((item) =>
        item.label.toLowerCase().includes(query.toLowerCase())
      ),
    [query]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg">

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SearchIcon className="h-5 w-5" /> Search
          </DialogTitle>
        </DialogHeader>
        <Command>
          <CommandInput
            placeholder="Search..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {filtered.map((item) => (
              <CommandItem key={item.href} onSelect={() => {
                // Navigate to the selected page
                window.location.href = item.href;
                onOpenChange(false);
              }}>
                {item.label}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
