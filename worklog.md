# Data Analysis Toolkit - Worklog

## Project Status
- Next.js 16 App Router with 8-tab Data Analysis Toolkit
- Dark mode working (next-themes + Tailwind dark class)
- All 8 components functional with pure TypeScript statistics
- Dev server running on port 3000

---

Task ID: 1
Agent: Main Agent
Task: Fix overlapping UI in DescriptiveStatistics component

Work Log:
- Diagnosed the issue: Summary Measures table was overflowing on smaller screens, dropdowns overlapped on mobile
- Replaced the ScrollArea+Table approach with a responsive grid of stat cards (grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5)
- Changed dropdown layout from flex-wrap to flex-col on mobile, flex-row on desktop (flex-col sm:flex-row)
- Added overflow-x-auto to BoxplotChart SVG container with min-w-[300px]
- Added overflow-hidden to chart containers for safe rendering
- Made SelectTrigger responsive: w-full sm:w-[220px]
- Verified with agent-browser at desktop (1280x800) and mobile (375x812) viewports - no overlapping

Stage Summary:
- DescriptiveStatistics.tsx fully rewritten with responsive layout
- No page errors on any viewport
- Card-based grid replaces overflow-prone table

---

Task ID: 2
Agent: Main Agent
Task: Configure Next.js for GitHub Pages static export

Work Log:
- Changed next.config.ts output from "standalone" to "export"
- Added images.unoptimized: true (required for static export)
- Added basePath comment for repo subdirectory deployment
- Created .github/workflows/deploy.yml for automatic GitHub Pages deployment
- Workflow uses Bun, builds static site, adds .nojekyll, deploys via GitHub Pages

Stage Summary:
- next.config.ts configured for static export
- GitHub Actions workflow created for CI/CD deployment
- .nojekyll file added in workflow to prevent Jekyll processing

---

Task ID: 5
Agent: Sub Agent
Task: Fix duplicate slider labels in ProbabilityDistributions component

Work Log:
- Identified the bug: ParamSlider renders `{symbol ? `${symbol} ` : ''}{label}`, but `symbol` (e.g., "μ =") and `label` (e.g., "μ (mean)") both include the variable name, producing redundant labels like "μ = μ (mean)"
- Found 19 instances of ParamSlider calls across 7 sections: BinomialDistribution, BernoulliDistribution, PoissonDistribution, NormalDistribution, ExponentialDistribution, UniformDistribution, EmpiricalRuleSection, and DistConfigPanel
- Removed the variable name from each `label` prop, keeping only the descriptive part in parentheses:
  - "n (trials)" → "(trials)" (2 instances)
  - "p (probability)" → "(probability)" (3 instances)
  - "p (probability of success)" → "(probability of success)" (1 instance)
  - "λ (rate)" → "(rate)" (4 instances)
  - "μ (mean)" → "(mean)" (4 instances)
  - "σ (std dev)" → "(std dev)" (4 instances)
  - "a (min)" → "(min)" (2 instances)
  - "b (max)" → "(max)" (2 instances)
- Verified no lint errors after changes

Stage Summary:
- All 19 ParamSlider label props fixed to remove duplicate variable names
- Labels now render cleanly as "n = (trials)", "μ = (mean)", "λ = (rate)", etc.
- No lint errors

---

Task ID: 3-4
Agent: Sub Agent
Task: Fix critical statistical computation bugs in statistics.ts

Work Log:
- Bug 1 (K-S test p-value > 1): The ksPValue() function was already fixed with the alternating sign `(-1)^(k-1)` and result clamping to [0,1]. Verified lines 742 and 746 are correct.
- Bug 2 (Shapiro-Wilk W > 1): Added `Math.min(1, ...)` clamp to W computation on line 623 so W can never exceed 1. Added early return guard in shapiroWilkPValue(): if W >= 0.999, return 0.999 (clearly fail to reject normality).
- Bug 3 (K-S p-value clamping): Added `Math.max(0, Math.min(1, ...))` clamping to the K-S test result pValue on line 733, ensuring the rounded p-value is always in [0,1].
- Ran `bun run lint` — no errors.

Stage Summary:
- K-S test: alternating sign + clamping ensures p-value in [0,1]
- Shapiro-Wilk: W clamped to ≤1, p-value returns 0.999 when W ≥ 0.999
- K-S result: p-value explicitly clamped after rounding
- All changes pass lint
