export function buildEssayGeneratorPath(companyName?: string | null, position?: string | null) {
  const params = new URLSearchParams()
  if (companyName?.trim()) params.set("company", companyName.trim())
  if (position?.trim()) params.set("position", position.trim())
  const query = params.toString()
  return `/essay-generator${query ? `?${query}` : ""}`
}