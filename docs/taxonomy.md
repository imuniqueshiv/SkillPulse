# Skill taxonomy

Phase 4 defines SkillPulse’s **canonical skill vocabulary** and how raw language maps onto it.

```text
raw term
  → deterministic normalize
  → alias or canonical name
  → canonical Skill
     or unresolved (never guessed)
```

NCO-2015, NCVET-NQR and NSQF are the Indian reference authorities. ESCO and O*NET may be stored as **mappings**, not as SkillPulse’s primary identifiers.

## Canonical skills

A `Skill` row is the unit later phases will attach to jobs, curricula and gaps.

| Field | Role |
| --- | --- |
| `id` | Stable UUID primary key |
| `code` | Stable public identifier (`sp.skill.typescript`) |
| `name` | Display name |
| `canonicalName` | Unique normalized lookup key |
| `description` | What the skill is — and what it is not, when similar names exist |
| `category` | Informal grouping (`information-technology`, `healthcare`, …) |
| `skillType` | `TECHNICAL`, `TRANSVERSAL`, `LANGUAGE`, `TOOL`, `DOMAIN`, `PROCESS` |
| `status` | `DRAFT`, `ACTIVE`, `DEPRECATED`, `ARCHIVED` |

Do not merge skills because names look similar. **Java** and **JavaScript** are different skills. **SQL** is not MySQL. **React** is not React Native.

List APIs return `ACTIVE` skills unless another `status` is requested. Normalization still resolves `DEPRECATED` skills so historical terms keep working. `ARCHIVED` and `DRAFT` do not resolve.

## Aliases

`SkillAlias` maps a surface form to one canonical skill.

- `rawTerm` is the human/job-board spelling
- `normalizedTerm` is `normalizeTerm(rawTerm)` and is **globally unique**
- `confidence` is curator-assigned (0–1), not a similarity score
- `authority` records who asserted the alias (usually `SKILLPULSE`)

One normalized term cannot point at two skills. If evidence is weak, leave the term unresolved.

## Normalization

`normalizeTerm` is a pure string function in `apps/api/src/modules/taxonomy/normalize.ts`. It:

1. Applies Unicode NFKC
2. Lowercases
3. Strips quotes
4. Keeps letters, digits, `+`, `#`, `.`, `/`
5. Collapses other characters to single spaces

It does **not** contain synonym lists. Abbreviations such as `JS` → JavaScript live in `SkillAlias` rows.

Lookup order for `GET /api/v1/taxonomy/normalize?term=`:

1. Exact `Skill.canonicalName`
2. Exact `SkillAlias.normalizedTerm`
3. `unresolved`

Typos, fuzzy matches and embeddings are out of scope.

Phase 5.9 job ingestion calls this same `resolveTerm`. It does not add a second matcher and does not persist `JobSkill`. See [data-sources.md](data-sources.md).

### Examples

| Input | Normalized | Result |
| --- | --- | --- |
| `  TypeScript  ` | `typescript` | canonical TypeScript |
| `JS` | `js` | alias → JavaScript |
| `Java` | `java` | canonical Java (not JavaScript) |
| `java scriptt` | `java scriptt` | unresolved |
| `quantum blockchain ninja` | `quantum blockchain ninja` | unresolved |

## Occupations and sectors

`Occupation.code` is the **NCO-2015 unit group** when populated (for example `2512` Software Developers).

`Sector` is an India-facing industry grouping (IT-ITeS, healthcare, BFSI, …). Optional `TaxonomyMapping` rows point at NIC-2008 sections. Those mappings are approximate; they are not SkillPulse sector ids.

`SkillOccupation` links a skill to an occupation with:

- `relation`: `CORE`, `RELATED`, or `OPTIONAL`
- `confidence` and `authority`

A missing link means “not asserted”, not “the skill is irrelevant”.

## External mappings

`TaxonomyMapping` attaches an external code to a skill, occupation or sector.

| Authority | Use |
| --- | --- |
| `NCO_2015` | Indian National Classification of Occupations, 2015 |
| `NCVET_NQR` | Qualification / NOS codes when a verified code exists |
| `NSQF` | Qualification *level* when a verified alignment exists |
| `NIC_2008` | Industry section/division for sectors |
| `ESCO` | European reference mapping |
| `ONET` | US O*NET-SOC reference mapping |
| `SKILLPULSE` | Curated internal assertion |

The seed includes NCO-2015 for every seeded occupation and a small set of NIC / ESCO / O*NET examples. It does **not** invent NCVET QP codes or NSQF levels.

## Seed / reference data

JSON under `data/taxonomy/` is loaded by `pnpm db:seed`. It is a small Maharashtra/India-oriented starter set (8 sectors, 10 NCO occupations, 18 skills), not a complete national taxonomy.

Re-running seed upserts by stable codes and names.

## APIs

All taxonomy routes require a Clerk Bearer token (any application role). They do not accept client-supplied identity.

See [api.md](api.md).
