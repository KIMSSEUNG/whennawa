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
          position: "relative",
          overflow: "hidden",
          padding: "54px",
          background:
            "linear-gradient(135deg, #eef4ff 0%, #dfe8ff 22%, #1f3f7f 58%, #121a2d 100%)",
          color: "#0f172a",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-120px",
            right: "-90px",
            width: "420px",
            height: "420px",
            borderRadius: "999px",
            background: "radial-gradient(circle, rgba(126,162,255,0.45) 0%, rgba(126,162,255,0) 72%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "-80px",
            bottom: "-120px",
            width: "360px",
            height: "360px",
            borderRadius: "999px",
            background: "radial-gradient(circle, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0) 72%)",
          }}
        />

        <div
          style={{
            display: "flex",
            width: "100%",
            borderRadius: "36px",
            border: "1px solid rgba(219,230,255,0.86)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(246,249,255,0.92) 100%)",
            boxShadow: "0 24px 60px rgba(24, 46, 107, 0.16)",
            padding: "40px 42px",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  width: "62px",
                  height: "62px",
                  borderRadius: "18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "linear-gradient(135deg, #4d84ff 0%, #2a63e8 100%)",
                  color: "#ffffff",
                  fontSize: "28px",
                  fontWeight: 900,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
                }}
              >
                W
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ fontSize: "30px", fontWeight: 900, color: "#1f366d" }}>언제나와</div>
                <div style={{ fontSize: "20px", color: "#6b7faa" }}>whennawa.shop</div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                borderRadius: "999px",
                padding: "10px 16px",
                background: "#eff4ff",
                color: "#4d6fb1",
                fontSize: "18px",
                fontWeight: 700,
                border: "1px solid #d9e5ff",
              }}
            >
              취업 타임라인 서비스
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontSize: "72px",
                lineHeight: 1.03,
                letterSpacing: "-2px",
                fontWeight: 900,
                color: "#13284f",
              }}
            >
              채용 일정과 지원 흐름을
              <br />
              한 화면에서 확인하세요
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontSize: "30px",
                lineHeight: 1.35,
                color: "#5e73a4",
                fontWeight: 600,
              }}
            >
              발표일 검색, 면접 후기, 게시판, 알림까지
              <br />
              취업 준비에 필요한 흐름을 더 빠르게 연결합니다.
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {["발표일 검색", "면접 후기", "회사 게시판", "알림 관리"].map((item) => (
              <div
                key={item}
                style={{
                  display: "flex",
                  alignItems: "center",
                  borderRadius: "999px",
                  padding: "12px 18px",
                  background: "#f5f8ff",
                  border: "1px solid #dbe5ff",
                  color: "#4666a7",
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
