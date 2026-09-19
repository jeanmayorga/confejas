import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import { LoaderCircleIcon } from "@hugeicons/core-free-icons"

function Spinner({
  className,
  ...props
}: Omit<React.ComponentProps<typeof HugeiconsIcon>, "icon">) {
  return (
    <HugeiconsIcon icon={LoaderCircleIcon} strokeWidth={2} data-slot="spinner" aria-hidden="true" className={cn("size-4 animate-spin", className)} {...props} />
  )
}

export { Spinner }
