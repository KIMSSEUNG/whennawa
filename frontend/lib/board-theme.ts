export const boardTheme = {
  heroSection:
    "relative overflow-hidden rounded-[28px] border border-[#d9e7f6] bg-[linear-gradient(180deg,#ffffff_0%,#f6fbff_100%)] p-5 shadow-[0_18px_40px_rgba(72,116,156,0.09)] dark:border-[#30435c] dark:bg-[linear-gradient(180deg,#111b2b_0%,#122233_100%)] dark:shadow-[0_22px_48px_rgba(0,0,0,0.34)] md:p-6",
  heroTopLine:
    "absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,#4e93c7_0%,#63aab8_52%,#d8edf2_100%)] dark:bg-[linear-gradient(90deg,#4e93c7_0%,#4ba7c3_52%,#1c4254_100%)]",
  heroGlowRight:
    "absolute -right-16 -top-12 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(92,160,190,0.16)_0%,rgba(92,160,190,0)_72%)] dark:bg-[radial-gradient(circle,rgba(66,145,181,0.2)_0%,rgba(66,145,181,0)_72%)]",
  heroGlowLeft:
    "absolute -left-12 bottom-0 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(176,214,227,0.18)_0%,rgba(176,214,227,0)_72%)] dark:bg-[radial-gradient(circle,rgba(88,132,156,0.18)_0%,rgba(88,132,156,0)_72%)]",
  heroEyebrow: "text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6f87a7] dark:text-[#8da9c8]",
  heroTitle: "mt-3 text-[30px] font-black tracking-tight text-[#224f74] dark:text-[#ddeefe] md:text-[38px]",
  heroDescription: "mt-3 max-w-[640px] text-sm leading-6 text-[#597694] dark:text-[#9bb6ca] md:text-[15px]",
  card: "rounded-2xl border border-[#dce8f4] bg-white dark:border-[#31475d] dark:bg-[#111b2b]",
  field: "border-[#d7e5f1] bg-white dark:border-[#365168] dark:bg-[#0f1726] dark:text-[#e5eefb] dark:placeholder:text-[#7d93ab] focus-visible:border-[#73acbf] focus-visible:ring-[#73acbf]/28",
  fieldSelect:
    "h-10 rounded-lg border border-[#d7e5f1] bg-white px-3 text-sm text-[#365875] outline-none dark:border-[#365168] dark:bg-[#0f1726] dark:text-[#d6e5f8] focus:border-[#73acbf] focus:ring-[3px] focus:ring-[#73acbf]/28",
  tag: "rounded-full border border-[#d4e5f0] bg-[#f2f8fb] px-2 py-0.5 text-[11px] text-[#517590] dark:border-[#365168] dark:bg-[#132438] dark:text-[#9fc3dc]",
  metaText: "text-[#4b5563] dark:text-[#93a4b8]",
  authorChip: "rounded-full bg-[#f3f4f6] px-2 py-0.5 text-[#374151] dark:bg-[#1a2435] dark:text-[#d5dfec]",
  messageChip: "rounded-full border border-[#d6e3ff] bg-[#f3f7ff] px-3 py-1 text-[#5470ab] dark:border-[#365168] dark:bg-[#142235] dark:text-[#98b7de]",
  solidButton: "bg-[#6ca8d0] text-white hover:bg-[#5b99c2] dark:bg-[#4d8eb8] dark:hover:bg-[#427ca1]",
  outlineButton: "border-[#d7e5f1] bg-white text-[#315a76] hover:bg-[#f3f8fb] dark:border-[#365168] dark:bg-[#111b2b] dark:text-[#cce1f2] dark:hover:bg-[#15273a]",
  ghostButton: "text-[#5f7e95] hover:bg-[#f1f7fa] hover:text-[#2b526d] dark:text-[#9bb6ca] dark:hover:bg-[#15273a] dark:hover:text-[#dceefe]",
  hoverCard: "transition-all hover:-translate-y-0.5 hover:border-[#c4dae9] hover:shadow-sm dark:hover:border-[#4b6984] dark:hover:bg-[#142336]",
  subtlePanel: "rounded-xl border border-[#dce8f4] bg-[#fafcff] dark:border-[#31475d] dark:bg-[#101827]",
  titleText: "text-[#111827] dark:text-[#f3f7ff]",
  bodyText: "text-[#111827] dark:text-[#e5eefb]",
} as const
