// PWA wrapper component that includes all PWA features

"use client"

import type React from "react"

import { InstallPrompt } from "./install-prompt"
import { OfflineIndicator } from "./offline-indicator"

export function PWAWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      <OfflineIndicator />
      {children}
      <InstallPrompt />
    </>
  )
}
