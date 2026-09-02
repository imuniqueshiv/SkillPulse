/**
 * Deterministic surface-form normalization for SkillPulse taxonomy lookup.
 *
 * This is not a synonym dictionary. Aliases live in the database.
 * Similar-looking names are never merged here.
 */
export function normalizeTerm(raw: string): string {
  return raw
    .normalize("NFKC")
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^\p{L}\p{N}+#./]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
