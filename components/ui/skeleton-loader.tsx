import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string
  variant?: "text" | "circular" | "rectangular"
}

export function Skeleton({ className, variant = "rectangular" }: SkeletonProps) {
  const baseClasses = "animate-pulse bg-muted rounded"
  
  const variantClasses = {
    text: "h-4 w-full",
    circular: "rounded-full aspect-square",
    rectangular: "h-20 w-full",
  }

  return (
    <div className={cn(baseClasses, variantClasses[variant], className)} />
  )
}

export function SkeletonCard() {
  return (
    <div className="space-y-3 p-4 border rounded-lg">
      <Skeleton variant="text" className="h-4 w-3/4" />
      <Skeleton variant="text" className="h-4 w-full" />
      <Skeleton variant="text" className="h-4 w-5/6" />
    </div>
  )
}

export function SkeletonTable() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4 p-4 border rounded-lg">
          <Skeleton variant="circular" className="h-10 w-10" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" className="h-4 w-1/4" />
            <Skeleton variant="text" className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

