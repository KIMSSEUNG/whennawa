export function toCompanySlug(companyName: string) {
  return encodeURIComponent(companyName.trim())
}

export function fromCompanySlug(companySlug: string) {
  return decodeURIComponent(companySlug)
}

