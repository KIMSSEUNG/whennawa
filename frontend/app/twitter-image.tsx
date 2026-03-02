import { ImageResponse } from "next/og"

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = "image/png"

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "22px",
          padding: "72px",
          background: "linear-gradient(140deg, #0f172a 0%, #172554 45%, #1d4ed8 100%)",
          color: "#f8fafc",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <div style={{ fontSize: "32px", fontWeight: 700, opacity: 0.9 }}>언제나와 | whennawa.shop</div>
        <div style={{ fontSize: "74px", fontWeight: 900, letterSpacing: "-1px", lineHeight: 1.08 }}>
          채용 타임라인
        </div>
        <div style={{ fontSize: "34px", opacity: 0.92 }}>공고 일정과 지원 흐름을 한 번에 확인하세요</div>
      </div>
    ),
    size,
  )
}
