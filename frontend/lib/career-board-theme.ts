export const careerBoardTheme = {
  heroSection:
    "relative overflow-hidden rounded-[28px] border border-[#e3defa] bg-[linear-gradient(180deg,#ffffff_0%,#fbf9ff_100%)] p-5 shadow-[0_18px_40px_rgba(109,98,168,0.08)] dark:border-[#3e375c] dark:bg-[linear-gradient(180deg,#171529_0%,#1b1730_100%)] dark:shadow-[0_22px_48px_rgba(0,0,0,0.34)] md:p-6",
  heroTopLine:
    "absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,#6f84f6_0%,#8d79ea_52%,#eadfff_100%)] dark:bg-[linear-gradient(90deg,#7b8fff_0%,#8573ec_52%,#362d64_100%)]",
  heroGlowRight:
    "absolute -right-16 -top-12 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(139,123,232,0.18)_0%,rgba(139,123,232,0)_72%)] dark:bg-[radial-gradient(circle,rgba(123,110,223,0.24)_0%,rgba(123,110,223,0)_72%)]",
  heroGlowLeft:
    "absolute -left-12 bottom-0 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(196,185,255,0.18)_0%,rgba(196,185,255,0)_72%)] dark:bg-[radial-gradient(circle,rgba(107,96,180,0.2)_0%,rgba(107,96,180,0)_72%)]",
  heroEyebrow: "text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7d73b4] dark:text-[#b2a8e6]",
  heroTitle: "mt-3 text-[30px] font-black tracking-tight text-[#3f3474] dark:text-[#eee9ff] md:text-[38px]",
  heroDescription: "mt-3 max-w-[640px] text-sm leading-6 text-[#6d6499] dark:text-[#b8b0da] md:text-[15px]",
  card: "rounded-2xl border border-[#e7e2f8] bg-white dark:border-[#433b62] dark:bg-[#19162a]",
  field: "border-[#dfdaf5] bg-white dark:border-[#4c456f] dark:bg-[#141222] dark:text-[#ece9fb] dark:placeholder:text-[#9b93be] focus-visible:border-[#9b8be9] focus-visible:ring-[#9b8be9]/30",
  fieldSelect:
    "h-10 rounded-lg border border-[#dfdaf5] bg-white px-3 text-sm text-[#5e4f96] outline-none dark:border-[#4c456f] dark:bg-[#141222] dark:text-[#e3dcff] focus:border-[#9b8be9] focus:ring-[3px] focus:ring-[#9b8be9]/30",
  tag: "rounded-full border border-[#ddd7f6] bg-[#f6f3ff] px-2 py-0.5 text-[11px] text-[#7464b0] dark:border-[#4a446b] dark:bg-[#231d39] dark:text-[#c3b8f4]",
  solidButton: "bg-[#8d79ea] text-white hover:bg-[#7c69da] dark:bg-[#7c69da] dark:hover:bg-[#6e5ccc]",
  outlineButton: "border-[#dfdaf5] bg-white text-[#56478b] hover:bg-[#f7f4ff] dark:border-[#4c456f] dark:bg-[#19162a] dark:text-[#ddd4ff] dark:hover:bg-[#241f3b]",
  metaText: "text-muted-foreground dark:text-[#9b93be]",
} as const
