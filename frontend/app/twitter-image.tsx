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
          position: "relative",
          overflow: "hidden",
          padding: "54px",
          background:
            "linear-gradient(135deg, #16305f 0%, #1b458d 44%, #2d6df3 100%)",
          color: "#ffffff",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-140px",
            right: "-80px",
            width: "420px",
            height: "420px",
            borderRadius: "999px",
            background: "radial-gradient(circle, rgba(207,226,255,0.24) 0%, rgba(207,226,255,0) 72%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "-60px",
            bottom: "-120px",
            width: "320px",
            height: "320px",
            borderRadius: "999px",
            background: "radial-gradient(circle, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 72%)",
          }}
        />

        <div
          style={{
            display: "flex",
            width: "100%",
            borderRadius: "36px",
            padding: "42px",
            flexDirection: "column",
            justifyContent: "space-between",
            background: "linear-gradient(180deg, rgba(12,19,39,0.12) 0%, rgba(8,15,31,0.26) 100%)",
            border: "1px solid rgba(216,229,255,0.18)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "62px",
                height: "62px",
                borderRadius: "18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #ffffff 0%, #dce8ff 100%)",
                color: "#275fe8",
                fontSize: "28px",
                fontWeight: 900,
              }}
            >
              W
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ fontSize: "30px", fontWeight: 900 }}>언제나와</div>
              <div style={{ fontSize: "20px", color: "rgba(255,255,255,0.78)" }}>whennawa.shop</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div style={{ display: "flex", flexDirection: "column", fontSize: "74px", lineHeight: 1.04, letterSpacing: "-2px", fontWeight: 900 }}>
              채용 일정과 후기,
              <br />
              한 번에 모아보기
            </div>
            <div style={{ display: "flex", flexDirection: "column", fontSize: "31px", lineHeight: 1.35, color: "rgba(255,255,255,0.86)", fontWeight: 600 }}>
              발표 흐름을 검색하고 면접 후기와 커뮤니티까지
              <br />
              더 빠르게 이어보는 취업 타임라인 서비스
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            {["검색", "후기", "게시판", "알림"].map((item) => (
              <div
                key={item}
                style={{
                  display: "flex",
                  alignItems: "center",
                  borderRadius: "999px",
                  padding: "12px 18px",
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  color: "#ffffff",
                  fontSize: "22px",
                  fontWeight: 700,
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  )
}
