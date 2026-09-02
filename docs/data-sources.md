# Data sources

Ingestion pipelines (job boards, filings, institute submissions) belong to later phases.

Phase 4 taxonomy uses **classification authorities**, not scraped job evidence:

| Authority | Role in SkillPulse |
| --- | --- |
| NCO-2015 | Primary occupation codes (`Occupation.code`) |
| NCVET-NQR / NSQF | Qualification mappings when a verified code/level exists |
| NIC-2008 | Optional sector crosswalk |
| ESCO / O*NET | Reference mappings only |

Curated starter rows live in `data/taxonomy/`. They are not labour-market observations.
