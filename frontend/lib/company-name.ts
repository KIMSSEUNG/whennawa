export function normalizeCompanyName(raw: string): string {
  if (!raw) return ""
  const normalized = raw
    .normalize("NFKC")
    .trim()
    .replace(/\(주\)|주식회사|㈜/g, "")
    .replace(/\s+/g, "")
    .replace(/[^0-9a-zA-Z가-힣]/g, "")
  return normalized
}
