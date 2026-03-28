import type React from "react"
import { redirect } from "next/navigation"

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  void children
  redirect("/search")
}
