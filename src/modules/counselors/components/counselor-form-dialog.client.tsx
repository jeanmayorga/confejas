"use client";

import UserAdd01Icon from "@hugeicons/core-free-icons/UserAdd01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CounselorForm,
} from "@/modules/counselors/components/counselor-form.client";

type CounselorFormDialogProps = {
  companies: { id: string; name: string }[];
  stakes: { id: number; name: string }[];
  wards: { id: number; name: string; stakeId: number }[];
};

export function CounselorFormDialog({
  companies,
  stakes,
  wards,
}: CounselorFormDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="default" size="default" />
        }
      >
        <HugeiconsIcon
          icon={UserAdd01Icon}
          strokeWidth={2}
          data-icon="inline-start"
        />
        Nuevo consejero
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Nuevo consejero</DialogTitle>
          <DialogDescription>
            Registra al consejero y asígnalo a su compañía y estaca.
            Habitualmente cada compañía cuenta con dos.
          </DialogDescription>
        </DialogHeader>

        <CounselorForm
          companies={companies}
          stakes={stakes}
          wards={wards}
          onCancel={() => setOpen(false)}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
