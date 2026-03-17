export const boardTheme = {
  heroSection:
    "relative overflow-hidden rounded-[28px] border border-[#d9e7f6] bg-[linear-gradient(180deg,#ffffff_0%,#f6fbff_100%)] p-5 shadow-[0_18px_40px_rgba(72,116,156,0.09)] md:p-6",
  heroTopLine:
    "absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,#4e93c7_0%,#63aab8_52%,#d8edf2_100%)]",
  heroGlowRight:
    "absolute -right-16 -top-12 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(92,160,190,0.16)_0%,rgba(92,160,190,0)_72%)]",
  heroGlowLeft:
    "absolute -left-12 bottom-0 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(176,214,227,0.18)_0%,rgba(176,214,227,0)_72%)]",
  heroEyebrow: "text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6f87a7]",
  heroTitle: "mt-3 text-[30px] font-black tracking-tight text-[#224f74] md:text-[38px]",
  heroDescription: "mt-3 max-w-[640px] text-sm leading-6 text-[#597694] md:text-[15px]",
  card: "rounded-2xl border border-[#dce8f4] bg-white",
  field: "border-[#d7e5f1] focus-visible:border-[#73acbf] focus-visible:ring-[#73acbf]/28",
  fieldSelect:
    "h-10 rounded-lg border border-[#d7e5f1] bg-white px-3 text-sm text-[#365875] outline-none focus:border-[#73acbf] focus:ring-[3px] focus:ring-[#73acbf]/28",
  tag: "rounded-full border border-[#d4e5f0] bg-[#f2f8fb] px-2 py-0.5 text-[11px] text-[#517590]",
  metaText: "text-[#4b5563]",
  authorChip: "rounded-full bg-[#f3f4f6] px-2 py-0.5 text-[#374151]",
  messageChip: "rounded-full border border-[#d6e3ff] bg-[#f3f7ff] px-3 py-1 text-[#5470ab]",
  solidButton: "bg-[#6ca8d0] text-white hover:bg-[#5b99c2]",
  outlineButton: "border-[#d7e5f1] bg-white text-[#315a76] hover:bg-[#f3f8fb]",
  ghostButton: "text-[#5f7e95] hover:bg-[#f1f7fa] hover:text-[#2b526d]",
  hoverCard: "transition-all hover:-translate-y-0.5 hover:border-[#c4dae9] hover:shadow-sm",
  subtlePanel: "rounded-xl border border-[#dce8f4] bg-[#fafcff]",
  titleText: "text-[#111827]",
  bodyText: "text-[#111827]",
} as const
