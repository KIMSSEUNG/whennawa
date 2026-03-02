import { ImageResponse } from "next/og"

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = "image/png"

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          background:
            "radial-gradient(circle at 15% 15%, #5c7cfa 0%, rgba(92,124,250,0) 40%), linear-gradient(135deg, #0b1220 0%, #111827 55%, #1f2937 100%)",
          color: "#f8fafc",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #4c6ef5 0%, #2f49b3 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
              fontWeight: 800,
            }}
          >
            W
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <div style={{ fontSize: "30px", fontWeight: 800 }}>언제나와</div>
            <div style={{ fontSize: "22px", opacity: 0.85 }}>whennawa.shop</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ fontSize: "66px", fontWeight: 900, letterSpacing: "-1px", lineHeight: 1.08 }}>
            채용 타임라인
          </div>
          <div style={{ fontSize: "32px", opacity: 0.9 }}>공고 일정과 지원 흐름을 한 번에</div>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          {["공고 탐색", "기업 후기", "취업 공유", "알림"].map((item) => (
            <div
              key={item}
              style={{
                border: "1px solid rgba(148, 163, 184, 0.45)",
                background: "rgba(15, 23, 42, 0.5)",
                borderRadius: "999px",
                padding: "10px 18px",
                fontSize: "22px",
                color: "#e2e8f0",
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  )
}
