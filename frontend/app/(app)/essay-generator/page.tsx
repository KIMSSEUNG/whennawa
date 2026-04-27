import EssayGeneratorClient from "./essay-generator-client"

export default function EssayGeneratorPage({
  searchParams,
}: {
  searchParams?: { company?: string; position?: string }
}) {
  const companyName = typeof searchParams?.company === "string" ? searchParams.company : ""
  const targetPosition = typeof searchParams?.position === "string" ? searchParams.position : ""
  const query = new URLSearchParams()
  if (companyName) query.set("company", companyName)
  if (targetPosition) query.set("position", targetPosition)
  const nextPath = `/essay-generator${query.toString() ? `?${query.toString()}` : ""}`

  return (
    <EssayGeneratorClient
      initialCompanyName={companyName}
      initialTargetPosition={targetPosition}
      nextPath={nextPath}
    />
  )
}
