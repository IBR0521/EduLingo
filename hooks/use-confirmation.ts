"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface ConfirmationOptions {
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive"
}

export function useConfirmation() {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmationOptions>({
    title: "Confirm Action",
    description: "Are you sure you want to proceed?",
    confirmText: "Confirm",
    cancelText: "Cancel",
    variant: "default",
  })
  const [onConfirm, setOnConfirm] = useState<(() => void) | null>(null)

  const confirm = (opts: ConfirmationOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions(opts)
      setOnConfirm(() => () => {
        setIsOpen(false)
        resolve(true)
      })
      setIsOpen(true)
    })
  }

  const handleCancel = () => {
    setIsOpen(false)
    setOnConfirm(null)
  }

  const ConfirmationDialog = () => (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{options.title}</AlertDialogTitle>
          <AlertDialogDescription>{options.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            {options.cancelText || "Cancel"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (onConfirm) onConfirm()
            }}
            className={options.variant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
          >
            {options.confirmText || "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  return {
    confirm,
    ConfirmationDialog,
  }
}



