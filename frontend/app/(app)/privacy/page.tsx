import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "개인정보처리방침",
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 md:px-6">
      <div className="rounded-2xl border border-border/60 bg-card p-6 md:p-8">
        <h1 className="text-2xl font-bold text-foreground">개인정보처리방침</h1>
        <p className="mt-2 text-sm text-muted-foreground">최종 업데이트: 2026-02-14</p>

        <section className="mt-6 space-y-2 text-sm text-foreground">
          <h2 className="text-base font-semibold">1. 수집 항목</h2>
          <p>로그인 정보(소셜 로그인 식별값), 서비스 이용 기록, 제보 및 채팅 입력 내용 등 서비스 운영에 필요한 최소한의 정보를 수집합니다.</p>
        </section>

        <section className="mt-6 space-y-2 text-sm text-foreground">
          <h2 className="text-base font-semibold">2. 이용 목적</h2>
          <p>회원 식별, 서비스 제공, 전형 데이터 품질 개선, 부정 이용 방지, 고객 문의 대응을 위해 개인정보를 처리합니다.</p>
        </section>

        <section className="mt-6 space-y-2 text-sm text-foreground">
          <h2 className="text-base font-semibold">3. 보유 및 파기</h2>
          <p>개인정보는 수집 및 이용 목적 달성 시 지체 없이 파기하며, 법령에 따라 보관이 필요한 경우 해당 기간 동안만 보관합니다.</p>
        </section>

        <section className="mt-6 space-y-2 text-sm text-foreground">
          <h2 className="text-base font-semibold">4. 개인정보 처리위탁 및 제3자 제공</h2>
          <p>회사는 원칙적으로 개인정보를 제3자에게 판매하거나 제공하지 않습니다.</p>
          <p>현재 서비스는 Google OAuth 로그인 연동을 사용하며, 로그인 인증 목적 범위에서 제공되는 정보만 처리합니다.</p>
          <p>서비스 운영 과정에서 호스팅, 로그/모니터링 등 외부 업체 위탁이 발생하는 경우 관련 법령에 따라 사전 고지 후 본 방침에 반영합니다.</p>
        </section>

        <section className="mt-6 space-y-2 text-sm text-foreground">
          <h2 className="text-base font-semibold">5. 이용자 권리</h2>
          <p>이용자는 본인의 개인정보에 대해 열람, 정정, 삭제, 처리정지를 요청할 수 있습니다.</p>
        </section>

        <section className="mt-6 space-y-2 text-sm text-foreground">
          <h2 className="text-base font-semibold">6. 문의</h2>
          <p>개인정보 관련 문의: whennawa@gmail.com</p>
        </section>
      </div>
    </div>
  )
}
