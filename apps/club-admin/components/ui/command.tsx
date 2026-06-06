'use client';

import * as React from 'react';
import * as Cmdk from 'cmdk';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

/** Root wrapper – applies the same rounded‑shadow styling used across the UI. */
export const Command = React.forwardRef<
  React.ElementRef<typeof Cmdk.Command>,
  React.ComponentPropsWithoutRef<typeof Cmdk.Command>
>(({ className, ...props }, ref) => (
  <Cmdk.Command
    ref={ref}
    className={cn(
      'relative flex h-96 w-full flex-col overflow-hidden rounded-lg bg-popover text-popover-foreground',
      className,
    )}
    {...props}
  />
));
Command.displayName = Cmdk.Command.displayName;

/** Input field – mirrors the styling of the `Input` component. */
export const CommandInput = React.forwardRef<
  React.ElementRef<typeof Cmdk.CommandInput>,
  React.ComponentPropsWithoutRef<typeof Cmdk.CommandInput> & {
    value?: string;
    onValueChange?: (value: string) => void;
  }
>(({ className, value, onValueChange, ...props }, ref) => (
  <div className="flex items-center border-b border-b-foreground/10 px-3 py-2">
    <Cmdk.CommandInput
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-md bg-transparent py-0 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      value={value}
      onValueChange={onValueChange}
      {...props}
    />
    {value && (
      <button
        type="button"
        onClick={() => onValueChange && onValueChange('')}
        className="ml-2 rounded-full p-1 hover:bg-muted/50"
      >
        <X className="h-4 w-4" />
      </button>
    )}
  </div>
));
CommandInput.displayName = Cmdk.CommandInput.displayName;

/** List container – vertical scrolling with a subtle divider. */
export const CommandList = React.forwardRef<
  React.ElementRef<typeof Cmdk.CommandList>,
  React.ComponentPropsWithoutRef<typeof Cmdk.CommandList>
>(({ className, ...props }, ref) => (
  <Cmdk.CommandList
    ref={ref}
    className={cn('max-h-[calc(100%-2.5rem)] overflow-y-auto', className)}
    {...props}
  />
));
CommandList.displayName = Cmdk.CommandList.displayName;

/** Empty state – centered message. */
export const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof Cmdk.CommandEmpty>,
  React.ComponentPropsWithoutRef<typeof Cmdk.CommandEmpty>
>(({ className, ...props }, ref) => (
  <Cmdk.CommandEmpty
    ref={ref}
    className={cn('py-6 text-center text-sm text-muted-foreground', className)}
    {...props}
  />
));
CommandEmpty.displayName = Cmdk.CommandEmpty.displayName;

/** Individual selectable item – adopts the button hover style used elsewhere. */
export const CommandItem = React.forwardRef<
  React.ElementRef<typeof Cmdk.CommandItem>,
  React.ComponentPropsWithoutRef<typeof Cmdk.CommandItem>
>(({ className, ...props }, ref) => (
  <Cmdk.CommandItem
    ref={ref}
    className={cn(
      'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
      'focus:bg-primary/10 focus:text-primary-foreground',
      'data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary-foreground',
      'hover:bg-muted/20',
      className,
    )}
    {...props}
  />
));
CommandItem.displayName = Cmdk.CommandItem.displayName;
