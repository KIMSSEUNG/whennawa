$ErrorActionPreference = "Stop"

$outputRoot = Join-Path $PSScriptRoot "..\design-previews\2026-03-ui-refresh"
$outputRoot = [System.IO.Path]::GetFullPath($outputRoot)

if (Test-Path $outputRoot) {
    Remove-Item -Recurse -Force $outputRoot
}

New-Item -ItemType Directory -Path $outputRoot | Out-Null

function Escape-Xml {
    param([string]$Value)
    if ($null -eq $Value) { return "" }
    return $Value.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;").Replace('"', "&quot;")
}

function New-Chip {
    param([int]$X,[int]$Y,[string]$Label)
    $safe = Escape-Xml $Label
    @"
<g transform="translate($X,$Y)">
  <rect width="222" height="42" rx="21" fill="#FFFFFF" fill-opacity="0.78" stroke="#C8D8FF"/>
  <circle cx="24" cy="21" r="8" fill="#4E7BFF"/>
  <text x="42" y="26" font-size="16" font-weight="600" fill="#3552A2">$safe</text>
</g>
"@
}

function New-Card {
    param([int]$X,[int]$Y,[int]$W,[int]$H,[string]$Title,[string[]]$Lines,[string]$Accent = "#4E7BFF")
    $safeTitle = Escape-Xml $Title
    $rows = @()
    $lineY = 90
    foreach ($line in $Lines) {
        $safeLine = Escape-Xml $line
        $rows += ('<text x="28" y="{0}" font-size="18" fill="#4C5E88">{1}</text>' -f $lineY, $safeLine)
        $lineY += 34
    }
    $rowBlock = ($rows -join "`n")
    @"
<g transform="translate($X,$Y)">
  <rect width="$W" height="$H" rx="30" fill="#FFFFFF" fill-opacity="0.88" stroke="#D9E5FF"/>
  <rect x="0" y="0" width="$W" height="16" rx="16" fill="$Accent" fill-opacity="0.92"/>
  <text x="28" y="54" font-size="28" font-weight="700" fill="#10214B">$safeTitle</text>
  $rowBlock
</g>
"@
}

function New-Panel {
    param([int]$X,[int]$Y,[int]$W,[int]$H,[string]$Title,[string[]]$Items)
    $safeTitle = Escape-Xml $Title
    $rows = @()
    $rowY = 86
    $rank = 1
    foreach ($item in $Items) {
        $safeItem = Escape-Xml $item
        $rows += @"
<g transform="translate(24,$rowY)">
  <rect width="$(($W) - 48)" height="56" rx="18" fill="#F4F7FF" stroke="#D8E2FF"/>
  <rect x="14" y="12" width="34" height="32" rx="10" fill="#4E7BFF"/>
  <text x="31" y="33" font-size="17" font-weight="700" text-anchor="middle" fill="#FFFFFF">$rank</text>
  <text x="66" y="34" font-size="18" font-weight="600" fill="#243A75">$safeItem</text>
</g>
"@
        $rowY += 70
        $rank += 1
    }
    $rowBlock = ($rows -join "`n")
    @"
<g transform="translate($X,$Y)">
  <rect width="$W" height="$H" rx="34" fill="#FFFFFF" fill-opacity="0.9" stroke="#D7E4FF"/>
  <text x="28" y="50" font-size="30" font-weight="700" fill="#10214B">$safeTitle</text>
  $rowBlock
</g>
"@
}

function New-Mock {
    param(
        [string]$FileName,
        [string]$PageTitle,
        [string]$PageSubtitle,
        [string]$Route,
        [string]$HeroTitle,
        [string[]]$Chips,
        [hashtable[]]$Cards,
        [string[]]$PanelItems,
        [string]$PanelTitle,
        [string]$FooterLabel
    )

    $chipMarkup = @()
    $chipX = 72
    foreach ($chip in $Chips) {
        $chipMarkup += New-Chip -X $chipX -Y 252 -Label $chip
        $chipX += 238
    }

    $cardMarkup = @()
    foreach ($card in $Cards) {
        $cardMarkup += New-Card -X $card.x -Y $card.y -W $card.w -H $card.h -Title $card.title -Lines $card.lines -Accent $card.accent
    }

    $panelMarkup = New-Panel -X 780 -Y 332 -W 580 -H 780 -Title $PanelTitle -Items $PanelItems

    $safePageTitle = Escape-Xml $PageTitle
    $safePageSubtitle = Escape-Xml $PageSubtitle
    $safeRoute = Escape-Xml $Route
    $safeHero = Escape-Xml $HeroTitle
    $safeFooter = Escape-Xml $FooterLabel

    $svg = @"
<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1400" viewBox="0 0 1440 1400" fill="none">
  <defs>
    <linearGradient id="bg" x1="80" y1="40" x2="1360" y2="1260" gradientUnits="userSpaceOnUse">
      <stop stop-color="#EEF4FF"/>
      <stop offset="0.55" stop-color="#F8FBFF"/>
      <stop offset="1" stop-color="#E9F0FF"/>
    </linearGradient>
    <radialGradient id="orbA" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1260 180) rotate(137) scale(420 320)">
      <stop stop-color="#7EA8FF" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#7EA8FF" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="orbB" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(220 1200) rotate(32) scale(430 300)">
      <stop stop-color="#8CD8FF" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#8CD8FF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="hero" x1="120" y1="84" x2="1320" y2="240" gradientUnits="userSpaceOnUse">
      <stop stop-color="#1D46B6"/>
      <stop offset="1" stop-color="#6E97FF"/>
    </linearGradient>
    <filter id="shadow" x="0" y="0" width="1440" height="1400" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="20" stdDeviation="24" flood-color="#AFC4F9" flood-opacity="0.32"/>
    </filter>
  </defs>
  <rect width="1440" height="1400" fill="url(#bg)"/>
  <rect width="1440" height="1400" fill="url(#orbA)"/>
  <rect width="1440" height="1400" fill="url(#orbB)"/>
  <g filter="url(#shadow)">
    <rect x="72" y="72" width="1296" height="180" rx="42" fill="url(#hero)"/>
    <text x="110" y="134" font-size="22" font-weight="600" fill="#DDE6FF">$safePageTitle</text>
    <text x="110" y="188" font-size="58" font-weight="800" fill="#FFFFFF">$safeHero</text>
    <text x="110" y="222" font-size="22" fill="#E8EEFF">$safePageSubtitle</text>
    <rect x="1020" y="104" width="280" height="52" rx="26" fill="#FFFFFF" fill-opacity="0.16" stroke="#AFC5FF"/>
    <text x="1160" y="138" font-size="18" text-anchor="middle" fill="#FFFFFF">$safeRoute</text>
  </g>
  $($chipMarkup -join "`n")
  $($cardMarkup -join "`n")
  $panelMarkup
  <g transform="translate(72,1172)">
    <rect width="1296" height="132" rx="40" fill="#12308B" fill-opacity="0.95"/>
    <text x="48" y="54" font-size="20" font-weight="700" fill="#FFFFFF">$safeFooter</text>
    <text x="48" y="92" font-size="18" fill="#C9D7FF">UI only concept. No backend or feature flow changes.</text>
    <g transform="translate(920,30)">
      <rect width="320" height="72" rx="26" fill="#FFFFFF"/>
      <text x="160" y="46" font-size="22" font-weight="700" text-anchor="middle" fill="#2040A3">Primary Action Preview</text>
    </g>
  </g>
</svg>
"@

    Set-Content -Path (Join-Path $outputRoot $FileName) -Value $svg -Encoding UTF8
}

$pages = @(
    @{ file = "00-home-reference.svg"; title = "Main Page"; subtitle = "Keep the current home direction, but sharpen hierarchy, spacing, and panels."; route = "/"; hero = "Home layout tuned, not replaced"; chips = @("Recent reports 56", "Weekly company pulse", "Alert conversion +18%"); cards = @(@{ x = 72; y = 332; w = 330; h = 256; title = "Live report feed"; lines = @("Push time and company first", "Shorter metadata lines", "Clear type split for regular intern rolling"); accent = "#3464F8" }, @{ x = 420; y = 332; w = 330; h = 256; title = "Weekly hot companies"; lines = @("Use stronger rank blocks", "Keep compact count signals", "Open detail without crowding the home"); accent = "#5C7EFF" }, @{ x = 72; y = 610; w = 678; h = 240; title = "Community modules"; lines = @("Turn list zones into framed modules", "Reduce repeated card treatment", "Give each block one primary action"); accent = "#7A92FF" }); panelTitle = "Alert center"; panelItems = @("FT report due today", "Samsung result changed", "LG weekly pattern shift", "Alert settings shortcut", "Saved companies recap"); footer = "Home keeps its role as the service dashboard" },
    @{ file = "01-search-command-center.svg"; title = "Search"; subtitle = "Search becomes the operational center with filters, timeline, and detail panel."; route = "/search"; hero = "Search as the main command center"; chips = @("Sticky filter memory", "Fast type switching", "Company detail panel on the side"); cards = @(@{ x = 72; y = 332; w = 330; h = 330; title = "Result stack"; lines = @("Selected card gets a stronger shell", "Reduce noise in secondary lines", "Keep board and post actions grouped"); accent = "#315EEA" }, @{ x = 420; y = 332; w = 330; h = 330; title = "Timeline canvas"; lines = @("Color code each recruitment type", "Surface date gaps visually", "Pin the most relevant schedule area"); accent = "#6A83FF" }, @{ x = 72; y = 688; w = 678; h = 292; title = "Company side sheet"; lines = @("Status, alerts, and quick report entry", "No page jump for primary exploration", "Mobile turns into a guided drawer"); accent = "#8DA3FF" }); panelTitle = "Selected company"; panelItems = @("Regular channels", "Intern channels", "Rolling average gap", "Interview review signal", "Board jump action"); footer = "Search becomes the strongest utility surface" },
    @{ file = "02-board-hub.svg"; title = "Board Hub"; subtitle = "Board hub shifts from plain lists to a topic-led company community surface."; route = "/board"; hero = "Company board hub with stronger topics"; chips = @("Followed companies first", "Response heavy threads", "Fast company entry"); cards = @(@{ x = 72; y = 332; w = 330; h = 292; title = "Company cards"; lines = @("Logo and board pulse together", "Show post count and fresh replies", "Use cleaner badges for trend state"); accent = "#3E65F7" }, @{ x = 420; y = 332; w = 330; h = 292; title = "Sort and tag bar"; lines = @("Recent hot rising tabs", "Persistent tag chips", "Better mobile grouping"); accent = "#5B7EF5" }, @{ x = 72; y = 646; w = 678; h = 334; title = "Topic clusters"; lines = @("Bundle salary welfare culture posts", "Suggest active conversations", "Jump into company board contextually"); accent = "#7C95FF" }); panelTitle = "Hot topics"; panelItems = @("Samsung team culture", "Final interview timing", "Naver spec sharing", "Intern return offer", "LG org questions"); footer = "Board hub should feel like a real community entrance" },
    @{ file = "03-company-board.svg"; title = "Company Board"; subtitle = "Each company board gets a stronger header and cleaner post stack."; route = "/board/[companySlug]"; hero = "Company board detail"; chips = @("Pinned company summary", "Write CTA stays visible", "Tags and sort in one band"); cards = @(@{ x = 72; y = 332; w = 330; h = 340; title = "Post cards"; lines = @("Two line title and short body", "Reply and like separated clearly", "Anonymous state easier to scan"); accent = "#3B62ED" }, @{ x = 420; y = 332; w = 330; h = 340; title = "Company header"; lines = @("Recruitment pulse summary", "Board plus report signals together", "Fast write action from the top"); accent = "#6B86F6" }, @{ x = 72; y = 698; w = 678; h = 282; title = "Type switch"; lines = @("All tips questions reviews", "Sticky segment on mobile", "Separate company info from board feed"); accent = "#8AA0FF" }); panelTitle = "Latest threads"; panelItems = @("Top liked thread", "Spec sharing wave", "Welfare question set", "Team mood review", "Interview discussion"); footer = "Company board should feel denser but easier to read" },
    @{ file = "04-post-detail.svg"; title = "Post Detail"; subtitle = "Post detail reads like a document page with focused comment handling."; route = "/board/[companySlug]/posts/[postId]"; hero = "Post detail and comments"; chips = @("Reading first layout", "Comment tree clarified", "Reaction tools stay fixed"); cards = @(@{ x = 72; y = 332; w = 678; h = 390; title = "Main document card"; lines = @("Title meta and body align on one axis", "Highlight critical sentences lightly", "Actions live in a separate lower rail"); accent = "#355EEF" }, @{ x = 72; y = 748; w = 678; h = 232; title = "Comment composer"; lines = @("Expand only when needed", "Anonymous mode is explicit", "Attach and submit remain unchanged"); accent = "#7892FE" }); panelTitle = "Comment stream"; panelItems = @("Top liked reply", "Recent answer cluster", "Solved question hint", "Fresh reply", "Moderator note"); footer = "Post detail favors reading quality over chrome" },
    @{ file = "05-write-flow.svg"; title = "Write Flow"; subtitle = "Write flow becomes a step-guided editor without changing fields or submit logic."; route = "/board/[companySlug]/write"; hero = "Writing flow with clearer stages"; chips = @("Title body options separated", "Draft guidance surfaced", "Less mobile friction"); cards = @(@{ x = 72; y = 332; w = 678; h = 308; title = "Editor stage"; lines = @("Group fields by intent not by raw order", "Editor sits in a clean frame", "Draft help appears as a top banner"); accent = "#4468F5" }, @{ x = 72; y = 668; w = 678; h = 312; title = "Post options"; lines = @("Anonymous tags preview submit", "Secondary controls go quiet", "Primary submit stays anchored"); accent = "#7D96FF" }); panelTitle = "Pre submit checklist"; panelItems = @("Title is clear", "Category selected", "Anonymous checked", "Profanity review", "Preview before submit"); footer = "Writing flow reduces hesitation, not capability" },
    @{ file = "06-career-board.svg"; title = "Career Board"; subtitle = "Career board moves toward a magazine style learning surface."; route = "/career-board"; hero = "Career board with editorial grouping"; chips = @("Topic led curation", "Shared hiring questions", "Archive friendly layout"); cards = @(@{ x = 72; y = 332; w = 330; h = 316; title = "Lead threads"; lines = @("Hiring season updates first", "Big company and startup tags", "Reply rich posts gain weight"); accent = "#395FEE" }, @{ x = 420; y = 332; w = 330; h = 316; title = "Curation module"; lines = @("Interview prep resources", "Weekly recommended reads", "Story style visual cards"); accent = "#5E80FF" }, @{ x = 72; y = 676; w = 678; h = 304; title = "Magazine list"; lines = @("Text only rows become mixed rhythm", "Important posts graduate to cards", "Everything else stays compact"); accent = "#88A0FF" }); panelTitle = "This week in career"; panelItems = @("Spring hiring opens", "Intern conversion talk", "Resume bullet guide", "Portfolio review tips", "Interview outfit questions"); footer = "Career board should feel more editorial and calm" },
    @{ file = "07-interview-reviews.svg"; title = "Interview Reviews"; subtitle = "Interview reviews get clearer stages, filters, and trend framing."; route = "/interview-reviews/[companySlug]"; hero = "Interview review redesign"; chips = @("Stage color system", "Stronger stage filters", "Sort tools stay visible"); cards = @(@{ x = 72; y = 332; w = 330; h = 318; title = "Review cards"; lines = @("Stage label sits above the body", "Actions and reactions separate", "Long text gets better rhythm"); accent = "#355FEE" }, @{ x = 420; y = 332; w = 330; h = 318; title = "Filter rail"; lines = @("Regular intern rolling", "Stage based chips", "Recent versus helpful sort"); accent = "#6785FF" }, @{ x = 72; y = 676; w = 678; h = 304; title = "Company summary"; lines = @("Most common stages shown first", "Average sentiment distribution", "Trend chart style summary block"); accent = "#8AA2FF" }); panelTitle = "Frequent keywords"; panelItems = @("Technical interview", "Job questions", "CS basics", "Project experience", "Case presentation"); footer = "Reviews should feel structured, not noisy" },
    @{ file = "08-notifications.svg"; title = "Notifications"; subtitle = "Notifications separate stream, highlights, and settings more cleanly."; route = "/notifications"; hero = "Notification management redesign"; chips = @("Live alerts grouped", "Company level control", "Today highlights first"); cards = @(@{ x = 72; y = 332; w = 678; h = 292; title = "Notification timeline"; lines = @("Time alone is not enough for priority", "Today section gets its own area", "Read and save actions align on one row"); accent = "#3F66F4" }, @{ x = 72; y = 648; w = 678; h = 332; title = "Settings dashboard"; lines = @("Company follow list", "Alert type toggles", "Report result signals highlighted"); accent = "#7A94FF" }); panelTitle = "Recent alerts"; panelItems = @("FT result posted", "Samsung report updated", "LG alert setting needed", "Rolling result reminder", "Notice about permissions"); footer = "Notifications should support action, not just logging" },
    @{ file = "09-profile.svg"; title = "Profile"; subtitle = "Profile becomes a personal dashboard with actions, stats, and settings."; route = "/profile"; hero = "Personal dashboard"; chips = @("Account summary", "My posts and reviews", "Block and alert settings"); cards = @(@{ x = 72; y = 332; w = 330; h = 286; title = "Profile card"; lines = @("Avatar nickname and account info", "Only editable items get emphasis", "Security area remains isolated"); accent = "#4066F1" }, @{ x = 420; y = 332; w = 330; h = 286; title = "Activity summary"; lines = @("Reports comments likes", "Recent activity trend", "Interview review participation"); accent = "#6383FF" }, @{ x = 72; y = 644; w = 678; h = 336; title = "Settings zones"; lines = @("Alerts blocks logout", "Sensitive actions pushed lower", "Less taps on mobile"); accent = "#8AA2FF" }); panelTitle = "Quick links"; panelItems = @("My reports", "My posts", "Interview reviews", "Alert settings", "Block management"); footer = "Profile should feel useful before it feels administrative" },
    @{ file = "10-login.svg"; title = "Login"; subtitle = "Login becomes a sharper entry page without changing auth behavior."; route = "/login"; hero = "Login entry surface"; chips = @("Social login upfront", "Short value summary", "Low friction first visit"); cards = @(@{ x = 72; y = 332; w = 678; h = 308; title = "Entry module"; lines = @("Brand copy gets shorter", "Google and other buttons align better", "Support links move to a quiet lower rail"); accent = "#3F67F3" }, @{ x = 72; y = 668; w = 678; h = 250; title = "Product intro"; lines = @("Explain value in three lines", "Reports boards and alerts", "No long marketing block"); accent = "#86A0FF" }); panelTitle = "First visit cues"; panelItems = @("Fast company search", "Result reports", "Interview reviews", "Community access", "Alert setup"); footer = "Login should optimize entry speed and confidence" },
    @{ file = "11-admin-reports.svg"; title = "Admin Reports"; subtitle = "Admin reports should feel like a moderation workbench."; route = "/admin/reports"; hero = "Report moderation workbench"; chips = @("Priority first sorting", "Regular intern rolling separated", "Fast approve reject flow"); cards = @(@{ x = 72; y = 332; w = 678; h = 330; title = "Queue review"; lines = @("Fields stay readable in one frame", "Reasons and context split clearly", "Approve and hold actions stay fixed"); accent = "#355FEF" }, @{ x = 72; y = 688; w = 678; h = 292; title = "Review assist"; lines = @("Stage suggestions and direct mapping", "Outlier warnings stand out", "Batch handling gains visibility"); accent = "#7A94FF" }); panelTitle = "Queue status"; panelItems = @("Pending reports", "Interview review checks", "Manual merge needed", "Duplicate detection", "Processed today"); footer = "Admin report UI should lower decision fatigue" },
    @{ file = "12-admin-company-requests.svg"; title = "Admin Company Requests"; subtitle = "Company requests should surface duplicate checks and merge choices."; route = "/admin/company-requests"; hero = "Company request triage"; chips = @("Approve reject states", "Duplicate suggestions", "Request context preserved"); cards = @(@{ x = 72; y = 332; w = 678; h = 298; title = "Request list"; lines = @("Show requested name time and status", "Duplicate suggestions appear inline", "Approve action gets priority placement"); accent = "#3F67F4" }, @{ x = 72; y = 656; w = 678; h = 324; title = "Merge helper"; lines = @("Suggest similar companies", "Show comparison result clearly", "Split create new from map existing"); accent = "#7A93FF" }); panelTitle = "Today request stats"; panelItems = @("New requests", "Duplicate alerts", "Approved items", "Rejected reasons", "Processing delay"); footer = "This admin surface should expose evidence before action" },
    @{ file = "13-legal-pages.svg"; title = "Legal Pages"; subtitle = "Terms and privacy keep trust, but become easier to read on mobile and desktop."; route = "/terms and /privacy"; hero = "Legal document layout"; chips = @("Clear section spacing", "Fixed table of contents", "Better mobile reading"); cards = @(@{ x = 72; y = 332; w = 678; h = 326; title = "Document body"; lines = @("Article number and heading separate", "Summary boxes for key sections", "Updated date appears at the top"); accent = "#4167F4" }, @{ x = 72; y = 684; w = 678; h = 296; title = "Support navigation"; lines = @("Table of contents and contact links", "Fast jump between long sections", "Still feels on brand, not plain text only"); accent = "#7C95FF" }); panelTitle = "Key document anchors"; panelItems = @("Retention policy", "Consent scope", "Notice updates", "User duties", "Contact channel"); footer = "Legal pages should read clearly without becoming sterile" }
)

foreach ($page in $pages) { New-Mock -FileName $page.file -PageTitle $page.title -PageSubtitle $page.subtitle -Route $page.route -HeroTitle $page.hero -Chips $page.chips -Cards $page.cards -PanelItems $page.panelItems -PanelTitle $page.panelTitle -FooterLabel $page.footer }

$galleryItems = $pages | ForEach-Object {
    $label = Escape-Xml $_.title
    $route = Escape-Xml $_.route
    $file = Escape-Xml $_.file
@"
      <article class="card">
        <img src="./$file" alt="$label preview" />
        <div class="meta">
          <h2>$label</h2>
          <p>$route</p>
        </div>
      </article>
"@
}

$gallery = @"
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>WhenNawa UI Refresh Previews</title>
  <style>
    :root { --bg: #eef4ff; --ink: #10214b; --muted: #5c6f99; --card: rgba(255,255,255,0.82); --line: #d4e1ff; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Segoe UI", sans-serif; background: radial-gradient(circle at 15% 10%, rgba(126,168,255,.35), transparent 28%), radial-gradient(circle at 80% 8%, rgba(104,132,255,.34), transparent 24%), linear-gradient(180deg, #edf3ff 0%, #f7faff 45%, #e8efff 100%); color: var(--ink); }
    header { max-width: 1480px; margin: 0 auto; padding: 48px 32px 24px; }
    h1 { margin: 0; font-size: 42px; line-height: 1.05; }
    header p { margin: 12px 0 0; font-size: 18px; color: var(--muted); max-width: 820px; }
    main { max-width: 1480px; margin: 0 auto; padding: 8px 32px 64px; display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 24px; }
    .card { margin: 0; border: 1px solid var(--line); border-radius: 28px; overflow: hidden; background: var(--card); backdrop-filter: blur(18px); box-shadow: 0 18px 40px rgba(99, 126, 199, 0.18); }
    .card img { width: 100%; display: block; background: #ffffff; }
    .meta { padding: 18px 20px 22px; }
    .meta h2 { margin: 0; font-size: 24px; }
    .meta p { margin: 8px 0 0; font-size: 15px; color: var(--muted); }
  </style>
</head>
<body>
  <header>
    <h1>WhenNawa UI Refresh Preview Set</h1>
    <p>Example redesign boards for the major pages. Home keeps the current direction. The rest of the pages are alternate UI and UX concepts only. No backend changes and no feature changes are assumed.</p>
  </header>
  <main>
$($galleryItems -join "`n")
  </main>
</body>
</html>
"@

Set-Content -Path (Join-Path $outputRoot "index.html") -Value $gallery -Encoding UTF8
Set-Content -Path (Join-Path $outputRoot "README.md") -Value "# UI Refresh Preview Set`r`n`r`nLocation: frontend/design-previews/2026-03-ui-refresh`r`n`r`nOpen index.html to browse the gallery.`r`n" -Encoding UTF8

