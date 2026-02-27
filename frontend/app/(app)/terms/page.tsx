import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "이용약관",
}

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 md:px-6">
      <div className="rounded-2xl border border-border/60 bg-card p-6 md:p-8">
        <h1 className="text-2xl font-bold text-foreground">이용약관</h1>
        <p className="mt-2 text-sm text-muted-foreground">최종 업데이트: 2026-02-14</p>

        <section className="mt-6 space-y-2 text-sm text-foreground">
          <h2 className="text-base font-semibold">1. 서비스 목적</h2>
          <p>언제나와는 기업 채용 전형 일정 정보를 제공하고, 사용자 제보를 통해 데이터를 보완하는 서비스입니다.</p>
        </section>

        <section className="mt-6 space-y-2 text-sm text-foreground">
          <h2 className="text-base font-semibold">2. 서비스 이용</h2>
          <p>회원은 본 약관 및 관련 법령을 준수하여 서비스를 이용해야 하며, 타인의 권리를 침해하는 행위를 해서는 안 됩니다.</p>
        </section>

        <section className="mt-6 space-y-2 text-sm text-foreground">
          <h2 className="text-base font-semibold">3. 제보 및 채팅 운영정책</h2>
          <p>사용자는 사실에 기반한 정보를 제보하고, 타인의 권리를 침해하지 않는 범위에서 채팅 기능을 이용해야 합니다.</p>
          <p>다음 행위는 금지됩니다: 허위사실 유포, 명예훼손 및 모욕, 욕설 및 차별 표현, 개인정보 노출, 광고/스팸, 불법 정보 게시.</p>
          <p>
            위반 내용이 확인되면 운영자는 사안의 중대성에 따라 게시물 삭제, 블라인드 처리, 채팅 기능 제한, 계정 이용 제한(일시/영구)을
            적용할 수 있습니다.
          </p>
          <p>
            조치에 대한 문의 또는 이의제기는 아래 이메일로 접수할 수 있으며, 운영자는 접수 내용 확인 후 내부 기준에 따라 검토합니다.
          </p>
        </section>

        <section className="mt-6 space-y-2 text-sm text-foreground">
          <h2 className="text-base font-semibold">4. 정보의 성격</h2>
          <p>서비스에서 제공하는 전형 일정, 예측 결과, 통계 정보는 참고용이며 실제 결과를 보장하지 않습니다.</p>
        </section>

        <section className="mt-6 space-y-2 text-sm text-foreground">
          <h2 className="text-base font-semibold">5. 책임 제한</h2>
          <p>회사는 서비스 이용 과정에서 발생한 간접적 손해, 기대이익 상실 등에 대해 법령상 허용되는 범위 내에서 책임을 제한합니다.</p>
        </section>

        <section className="mt-6 space-y-2 text-sm text-foreground">
          <h2 className="text-base font-semibold">6. 문의</h2>
          <p>서비스 관련 문의: whennawa@gmail.com</p>
        </section>
      </div>
    </div>
  )
}
