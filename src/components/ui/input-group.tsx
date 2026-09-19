import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group"
      role="group"
      className={cn(
        "group/input-group relative flex h-9 w-full min-w-0 items-center rounded-full border border-input bg-background transition-colors outline-none has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-3 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/30 has-[[data-slot][aria-invalid=true]]:border-destructive has-[[data-slot][aria-invalid=true]]:ring-3 has-[[data-slot][aria-invalid=true]]:ring-destructive/20 dark:bg-input/30 dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40 has-[[data-align=inline-end]]:[&>input]:pr-1.5 has-[[data-align=inline-start]]:[&>input]:pl-1.5",
        className,
      )}
      {...props}
    />
  );
}

function InputGroupAddon({
  className,
  children,
  align = "inline-start",
  ...props
}: React.ComponentProps<"div"> & {
  align?: "inline-start" | "inline-end" | "block-start" | "block-end";
}) {
  const alignClassName = {
    "inline-start": "order-first pl-3",
    "inline-end": "order-last pr-2",
    "block-start": "order-first w-full justify-start px-3 py-1.5",
    "block-end": "order-last w-full justify-start px-3 py-1.5",
  }[align];

  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      className={cn(
        "flex h-auto shrink-0 cursor-text items-center justify-center gap-2 py-1.5 text-sm font-medium text-muted-foreground select-none [&>svg:not([class*='size-'])]:size-4",
        alignClassName,
        className,
      )}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("button")) return;
        event.currentTarget.parentElement?.querySelector("input")?.focus();
      }}
      {...props}
    >
      {children}
    </div>
  );
}

function InputGroupInput({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <Input
      data-slot="input-group-control"
      className={cn(
        "h-9 flex-1 rounded-none border-0 bg-transparent px-2.5 py-0 shadow-none ring-0 focus-visible:ring-0 aria-invalid:ring-0 dark:bg-transparent",
        className,
      )}
      {...props}
    />
  );
}

type InputGroupButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  "size" | "type"
> & {
  type?: "button" | "submit" | "reset";
  size?: "xs" | "sm" | "icon-xs" | "icon-sm";
};

function InputGroupButton({
  className,
  type = "button",
  variant = "ghost",
  size = "icon-xs",
  ...props
}: InputGroupButtonProps) {
  const sizeClassName = {
    xs: "rounded-xl px-1.5 [&>svg:not([class*='size-'])]:size-3.5",
    sm: "",
    "icon-xs": "rounded-xl p-0 has-[>svg]:p-0",
    "icon-sm": "p-0 has-[>svg]:p-0",
  }[size];

  return (
    <Button
      type={type}
      size={size}
      data-size={size}
      variant={variant}
      className={cn(
        "flex items-center gap-2 rounded-4xl text-sm shadow-none",
        sizeClassName,
        className,
      )}
      {...props}
    />
  );
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
};
