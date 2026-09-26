"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function MobileUnassignedSheet({
  title,
  description,
  icon,
  open,
  onOpenChange,
  children,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger
        render={
          <Button
            size="lg"
            className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-40 shadow-lg xl:hidden"
          />
        }
      >
        {icon}
        {title}
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="h-[min(85dvh,46rem)] max-h-[calc(100dvh-2rem)] min-h-0 overflow-hidden p-0"
      >
        <SheetHeader className="shrink-0 border-b px-5 py-4">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
