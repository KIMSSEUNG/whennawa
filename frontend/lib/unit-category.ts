export const UNIT_CATEGORY_OPTIONS = [
  { value: "일반", label: "일반", hint: "비즈니스" },
  { value: "디자인/예술", label: "디자인/예술", hint: "" },
  { value: "IT", label: "IT", hint: "개발" },
  { value: "기술/엔지니어", label: "기술/엔지니어", hint: "" },
  { value: "통합직군", label: "통합직군", hint: "전체직군" },
] as const

export const UNIT_CATEGORY_EXAMPLES: Record<string, string[]> = {
  IT: ["웹개발", "서버개발", "백엔드", "프론트엔드", "AI/데이터", "인프라/보안", "게임개발"],
  "기술/엔지니어": [
    "공정기술",
    "생산관리",
    "품질관리",
    "설비",
    "R&D(기계/전자/화학)",
    "플랜트",
    "건설/토목",
  ],
  일반: ["영업", "마케팅", "경영지원", "인사(HR)", "회계/재무", "구매/SCM", "전략기획"],
  "디자인/예술": ["UI/UX", "제품디자인", "시각디자인", "영상/모션", "패션/VMD"],
  통합직군: ["전체직군"],
}

const UNIT_CATEGORY_MAP: Record<string, string> = {
  "일반": "일반",
  "비즈니스": "일반",
  "general": "일반",
  "business": "일반",

  "디자인/예술": "디자인/예술",
  "디자인예술": "디자인/예술",
  "디자인": "디자인/예술",
  "예술": "디자인/예술",
  "design": "디자인/예술",
  "art": "디자인/예술",
  "arts": "디자인/예술",

  "it": "IT",
  "개발": "IT",
  "dev": "IT",
  "developer": "IT",
  "software": "IT",
  "sw": "IT",

  "기술/엔지니어": "기술/엔지니어",
  "기술엔지니어": "기술/엔지니어",
  "기술": "기술/엔지니어",
  "엔지니어": "기술/엔지니어",
  "engineering": "기술/엔지니어",
  "engineer": "기술/엔지니어",
  "tech": "기술/엔지니어",

  "통합직군": "통합직군",
  "전직군": "통합직군",
  "전체직군": "통합직군",
  "전 직군": "통합직군",
  "전체 직군": "통합직군",
  "종합": "통합직군",
  "all": "통합직군",
}

export function normalizeUnitCategory(unitName: string | null | undefined): string | null {
  if (!unitName) return null
  const trimmed = unitName.trim()
  if (!trimmed) return null
  return UNIT_CATEGORY_MAP[trimmed] ?? UNIT_CATEGORY_MAP[trimmed.toLowerCase()] ?? trimmed
}
