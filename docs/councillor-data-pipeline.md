# Councillor Data Pipeline

This document tracks the provenance, known gaps, and next-phase plan for
populating Kerala's elected representatives in the Ente Nadu database.

---

## Current coverage (as of April 2026)

| Tier | Scope | Records | Seed file |
|---|---|---:|---|
| **Member of Parliament (MP)** | All Kerala Lok Sabha constituencies | 20 | `seed-kerala-mps.json` |
| **MLA** | All Kerala Legislative Assembly constituencies | 133 | `seed-kerala-mlas.json` |
| **Corporation councillor** | All 6 Municipal Corporations (post-2025 LSG election) | **415** | `seed-kerala-corporation-councillors.json` |
| Municipal councillor | 87 municipalities (~3,500) | 0 | _pending — Phase 2_ |
| Panchayat president | 941 grama panchayats | 0 | _pending — Phase 3_ |
| Panchayat members, block/district | ~22,000 rural members | 0 | _pending — Phase 4_ |

**Total representatives currently in seeds: 568**

---

## How the data flows

```
┌──────────────────────┐     ┌──────────────────────────┐
│ seed-kerala-*.json   │     │ seed-kerala-             │
│  (MPs / MLAs)        │     │  representatives.ps1     │
└──────────┬───────────┘     │  (batches of 100)        │
           │                 └──────────┬───────────────┘
           │                            │
           ▼                            ▼
┌─────────────────────────────────────────────────────┐
│ POST /v1/admin/elected-representatives/import       │
│   → accountability_service                          │
│   → Upsert by (name, role, constituency_name)       │
│   → Create ward_links if ward_ids provided          │
└──────────┬──────────────────────────────────────────┘
           ▼
┌─────────────────────────────────────────────────────┐
│ Postgres:                                           │
│   elected_representatives                           │
│   elected_representative_wards                      │
└─────────────────────────────────────────────────────┘
```

The importer is **idempotent** — re-running it updates existing records rather than creating duplicates.

---

## Phase 1 — Corporation councillors (DONE)

### Source
2025 Kerala Local Self-Government election results, held 9 & 11 December 2025,
results announced 13 December 2025. Data aggregated from:
- India TV News full ward-wise winner tables (5 corporations)
- KeralaLotteryResult + IndiaTV for Thiruvananthapuram Corporation
- Cross-checked against Wikipedia 2025 Kerala local elections page

### Ward counts seeded

| Corporation | District | Wards seeded | Known gaps |
|---|---|---:|---|
| Thiruvananthapuram | Thiruvananthapuram | 100 | Ward 101 (Vizhinjam) — polling postponed per ECI |
| Kollam | Kollam | 56 | — |
| Kochi | Ernakulam | 75 | — |
| Thrissur | Thrissur | 56 | Names may have minor transliteration errors (see below) |
| Kozhikode | Kozhikode | 72 | 3 wards missing from source: Punchappadam (51), Kappakkal (54), Valiyangadi (61) |
| Kannur | Kannur | 56 | — |
| **Total** | | **415** | |

### Known data quality caveats

1. **Malayalam names (`name_ml`) are blank** for all 415 records — news sources published only the English transliteration. To populate these we'd need to join against the official SEC Kerala PDF results (manual/OCR) or an RTI request per corporation.
2. **Phone & email are blank** — corporation councillors' direct contact info isn't published centrally. Options: RTI to each corporation secretariat, or use the corporation's main switchboard + LSGD-issued email pattern once confirmed.
3. **Party normalization**: Thrissur data from the source was labelled by alliance (`UDF` / `LDF` / `NDA` / `OTH`) rather than individual party. Those 56 records keep the alliance code. All other corporations have granular party (INC, CPI(M), BJP, IUML, RSP, CPI, KC, SDPI, NCP(SCP), INC(S), IND).
4. **Transliteration anomalies** — a handful of names in the source table appear to be machine-translated from Malayalam and may be mangled:
   - Thrissur ward 4 (Viyyur): "Arun" (source said "In the Arun basin" — cleaned)
   - Thrissur ward 12 (Nettissery): "Syntromol Sogen" — unusual; verify
   - Thrissur ward 48 (Aranattukara): "Vasu" (source said "Different Vasu" — cleaned)
   - Kochi ward 59 (Perumbadappu): "Written NX" — likely a transliteration artefact; verify
   - Kochi wards 10, 45, 46, 67, 71 (several "Independent" entries): name field holds a placeholder
5. **Ward numbers** are implicit (order of appearance in the seed) since news tables didn't always include an official ward-number column. Official SEC numbering may differ.
6. **Link to ward geometry**: `ward_ids` field is empty on every record — the import creates the councillor row but no ward link until we import official ward GeoJSON (see `infra/import-wards.ps1`). Once ward geometries land, we can link via `local_body_code` (one of `KL-TVMCORP`, `KL-KLMCORP`, `KL-KCHCORP`, `KL-TSRCORP`, `KL-KZKCORP`, `KL-KNRCORP`) + ward name.

### Running the seeder

```powershell
cd infra
.\seed-kerala-representatives.ps1 `
  -ApiBase "https://api.ente-nadu.in" `
  -AdminApiKey "<your admin key>"
```

Default behaviour: seeds all three files (MPs, MLAs, corporation councillors) in batches of 100. To seed only the councillor file:

```powershell
.\seed-kerala-representatives.ps1 `
  -Files @("seed-kerala-corporation-councillors.json") `
  -AdminApiKey "<your admin key>"
```

---

## Phase 2 — Municipal councillors (~3,500 records)

**Scope**: 87 municipalities × ~35–45 councillors each.

**Data availability**: SEC Kerala publishes 87 PDFs with winners per municipality — one document per LSG body. No aggregated CSV/JSON.

**Suggested approach**:
1. Build a Python scraper: `tools/scrape_sec_kerala.py` that:
   - Iterates the official SEC results listing
   - Downloads each municipality's winners PDF
   - OCRs / parses into the same schema as `seed-kerala-corporation-councillors.json`
   - Writes `seed-kerala-municipal-councillors.json` (partitioned per district)
2. Run the scraper once per election cycle (every 5 years).
3. Hand-verify a 10% sample before seeding production.

**Time estimate**: 1–2 weeks of focused work (scraper + validation + manual cleanup).

---

## Phase 3 — Panchayat presidents (941 records)

**Scope**: One president per grama panchayat.

**Data availability**: LSGD Kerala publishes the list of panchayat presidents (slightly more accessible than individual members). Wikipedia and district gazettes also list them.

**Suggested approach**: Same scraper extended to iterate the 14 district gazettes + LSGD directory. Expect 3–4 days of work.

---

## Phase 4 — Full ward member coverage (~22,000 records)

**Scope**: All elected members of:
- 941 grama panchayats × ~17 wards = ~16,000 members
- 152 block panchayats × ~15 members = ~2,280 members
- 14 district panchayats × ~20 members = ~280 members
- Plus the ~3,500 already covered in Phases 1 & 2

**Data availability**: Full SEC PDFs (one per LSG body, ~1,100 documents).

**Suggested approach**:
- This is a significant sustained effort. Expect 3–4 weeks plus RTI work to obtain phone/email where missing.
- May want to partner with one of: DataMeet, Kerala Tech Community, or a civic-tech intern cohort.

---

## Future enrichment

Once the identity records are in, these are the highest-value enrichments to add:

| Field | Source | Effort |
|---|---|---|
| `name_ml` (Malayalam name) | SEC PDFs + manual review | Medium |
| `phone` | RTI per LSG body | High |
| `email` | LSGD directory + confirmation | Medium |
| `photo_url` | Scrape corporation / niyamasabha websites | Low |
| `twitter_handle` | Manual | Low |
| `ward_id` link | After ward GeoJSON import | Low (programmatic match on local_body_code + ward name) |

---

## Files in `infra/` that relate to this pipeline

```
infra/
  seed-kerala-mps.json                         # 20 MPs
  seed-kerala-mlas.json                        # 133 MLAs
  seed-kerala-corporation-councillors.json     # 415 councillors (Phase 1)
  seed-kerala-representatives.ps1              # Idempotent batch seeder
  import-wards.ps1                             # Ward geometry importer (separate)
```

And the corresponding API surface:

```
api/app/
  api/routes/accountability.py                 # Admin import endpoint
  services/accountability_service.py           # Leaderboard + ward → rep lookup
  models/elected_representative.py             # Data model
  models/elected_representative_ward.py        # Ward link
  models/enums.py                              # RepresentativeRole enum (6 tiers)
```
