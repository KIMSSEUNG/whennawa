import type { User } from "./types"

export const mockUser: User = {
  id: "1",
  name: "Jiwon Kim",
  email: "jiwon.kim@example.com",
  role: "USER",
  avatar: "/korean-professional-avatar.jpg",
}

export const mockCompanies: Array<{ companyName: string; lastUpdatedAt: Date }> = [
  {
    companyName: "Naver",
    lastUpdatedAt: new Date("2026-01-14"),
  },
  {
    companyName: "Kakao",
    lastUpdatedAt: new Date("2026-01-12"),
  },
  {
    companyName: "Samsung Electronics",
    lastUpdatedAt: new Date("2026-01-10"),
  },
  {
    companyName: "??",
    lastUpdatedAt: new Date("2026-01-16"),
  },
  {
    companyName: "Coupang",
    lastUpdatedAt: new Date("2026-01-08"),
  },
  {
    companyName: "LINE",
    lastUpdatedAt: new Date("2026-01-15"),
  },
  {
    companyName: "Toss",
    lastUpdatedAt: new Date("2026-01-05"),
  },
  {
    companyName: "Baemin",
    lastUpdatedAt: new Date("2026-01-13"),
  },
  {
    companyName: "Kurly",
    lastUpdatedAt: new Date("2026-01-11"),
  },
]
