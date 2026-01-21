"use client"

import { Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface LoadingStateProps {
  message?: string
}

export function LoadingState({ message = "Loading..." }: LoadingStateProps) {
  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20"></div>
          <Loader2 className="relative h-10 w-10 animate-spin text-primary" />
        </div>
        <p className="mt-6 text-sm font-medium text-muted-foreground animate-pulse">{message}</p>
      </CardContent>
    </Card>
  )
}



