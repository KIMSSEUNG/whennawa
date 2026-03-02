import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "언제나와 | 채용 타임라인",
    short_name: "언제나와",
    description: "채용 공고 일정과 지원 흐름을 한 번에 확인하는 취업 타임라인 서비스.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b1220",
    theme_color: "#3B5BDB",
    lang: "ko-KR",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  }
}
