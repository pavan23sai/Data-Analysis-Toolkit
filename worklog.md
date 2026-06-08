---
Task ID: 1
Agent: Main Agent
Task: Fix overlapping data issues and add dark mode support

Work Log:
- Analyzed uploaded screenshot using VLM to identify overlapping issues in DataExploration component
- Verified all 8 component files exist on disk
- Added ThemeProvider from next-themes to layout.tsx with attribute="class", defaultTheme="system", enableSystem
- Added dark mode toggle button (Sun/Moon icon) to header in page.tsx
- Rewrote DataExploration.tsx to fix overlapping issues:
  - Moved Badge elements out of CardDescription to prevent text overlap
  - Added whitespace-nowrap to all table cells
  - Wrapped tables in bordered containers with proper overflow handling
  - Added proper spacing between sections with dividers
  - Added comprehensive dark mode classes throughout
- Updated page.tsx with full dark mode support (header, nav, footer, badges)
- Delegated dark mode updates to 3 subagents:
  - DescriptiveStatistics.tsx: Updated SVG colors, Recharts tooltips, axis labels for dark mode
  - NormalityTesting.tsx: Updated all Badge variants, Card borders, bg-muted/50 areas
  - ProbabilityDistributions.tsx: Updated all 15 Recharts tooltips, info boxes, stats display
- Other components already had dark mode classes (DataUpload, ZScoreCLT, ParametricTests, NonParametricTests)
- Ran lint - no errors
- Tested in browser: Data Upload, Data Exploration, Descriptive Statistics, Probability Distributions all working
- Dark mode toggle verified working - switches between light and dark themes
- No overlapping elements detected in Data Exploration section

Stage Summary:
- Overlapping data issue fixed by restructuring DataExploration component layout
- Dark mode fully implemented with next-themes ThemeProvider, toggle button in header
- All 8 components now support dark mode with appropriate color variants
- App renders cleanly with no build or runtime errors
