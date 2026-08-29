# anoGWAmo?

PUP SIS GWA calculator, Latin Honors checker, and curriculum planner (Manifest V3).

## Stack & Commands

- Runtime: Bun | Linter: Biome | Testing: `bun test` | Packager: `build.ts` + `fflate`
- Polyfill: `webextension-polyfill`

```bash
bun install    # Install dependencies
bun run build  # Build dist/chrome, dist/firefox & zip bundles
bun test       # Run tests (src/**/*.test.js)
bun run check  # Biome check & format
bun run format # Biome format write
```

## Structure

```
├── build.ts              # Bundles JS (Bun.build), CSS, fonts, manifests & zips
├── manifest.json         # Base MV3 manifest
├── popup/                # Extension popup dashboard & storage sync
├── report/               # Printable standalone report template & generator
├── src/
│   ├── content.js        # Content script for PUP SIS grades pages
│   ├── gwa-chart.js      # Canvas Bezier GWA progress chart renderer
│   ├── gwa-chart.css     # Chart styles
│   ├── styles.css        # Dashboard UI styles
│   └── core/
│       ├── constants.js  # Honor brackets, storage keys, SIS hosts
│       ├── compute.js    # GWA calculation (Modes A/B/C) & disqualifiers
│       ├── export.js     # PDF export & chart image generator
│       ├── renderers.js  # Dashboard HTML renderers
│       ├── scraper.js    # SIS DOM scrapers (grades & curriculum modal)
│       ├── theme.js      # Theme detection & sync
│       ├── utils.js      # Grade parser, honor resolvers, course filters
│       └── utils.test.js # Core unit tests
└── dist/                 # Outputs (dist/chrome, dist/firefox, zips)
```

## Modes & Honor Rules

- **Mode A (Manual)**: $\sum(\text{Grade} \times \text{Units}) / \sum(\text{Units})$. Excludes non-academic (`PATHFIT`, `NSTP`, `CWTS`, `ROTC`).
- **Mode B (Site GPA)**: $\sum(\text{SIS GPA} \times \text{Academic Units}) / \sum(\text{Academic Units})$.
- **Mode C (Planner)**: Completed GWA + projected grades for remaining curriculum units.

### Latin Honors (PUP Handbook)

| Honor | Range |
|---|---|
| Summa Cum Laude | 1.0000 – 1.1500 |
| Magna Cum Laude | 1.1501 – 1.3500 |
| Cum Laude | 1.3501 – 1.6000 |

**Disqualifications**: Failing grade (`5.0`), grade `< 2.5`, Incomplete (`Inc`), or Withdrawn (`W`).
