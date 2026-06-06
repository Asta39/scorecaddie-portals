// "use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty } from "@/components/ui/command";
import { SearchIcon } from "lucide-react";

// Simple list of searchable items. In a real app, this could be fetched or derived from routes.
const items = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/caddies", label: "Caddies" },
  { href: "/clubs", label: "Clubs" },
  { href: "/settings", label: "Settings" },
];

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
      <DialogTrigger asChild>
        {/* The trigger is hidden because we control opening from the Sidebar button */}
        <button className="hidden" />
      </DialogTrigger>
      <DialogContent className="max-w-md sm:max-w-lg" onOpenAutoFocus={(e) => e.preventDefault()}>
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
