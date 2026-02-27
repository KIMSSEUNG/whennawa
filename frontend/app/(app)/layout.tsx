import type React from "react"
import { Suspense } from "react"
import { AppShell } from "@/components/app-shell"
import { GlobalReportModal } from "@/components/global-report-modal"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      {children}
      <Suspense fallback={null}>
        <GlobalReportModal />
      </Suspense>
    </AppShell>
  )
}
