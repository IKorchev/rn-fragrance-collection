import React, { createContext, useContext, useRef, useState, type ReactNode } from "react"
import ToastBanner from "@/components/toast-banner"

export interface Toast {
  message: string
  actionLabel?: string
  onAction?: () => void
}

interface ToastContextValue {
  showToast: (toast: Toast & { duration?: number }) => void
  hideToast: () => void
}

const ToastContext = createContext<ToastContextValue>({} as ToastContextValue)

const useToast = () => {
  return useContext(ToastContext)
}

export const ToastContextProvider = ({ children }: { children: ReactNode }) => {
  const [toast, setToast] = useState<Toast | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const hideToast = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setToast(null)
  }

  const showToast = ({ message, actionLabel, onAction, duration = 4000 }: Toast & { duration?: number }) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setToast({ message, actionLabel, onAction })
    timeoutRef.current = setTimeout(() => setToast(null), duration)
  }

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <ToastBanner toast={toast} onDismiss={hideToast} />
    </ToastContext.Provider>
  )
}

export default useToast
