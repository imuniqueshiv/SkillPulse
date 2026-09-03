import type { JobIntelligenceJobInput, PreparedJobText } from "./contract";

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * Collapse formatting noise without lowercasing or stripping technical punctuation.
 */
export function tidyJobText(value: unknown): string {
  return asText(value)
    .normalize("NFKC")
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Prepare canonical Job text for analysis. Does not mutate the job.
 * Does not read raw ingestion payloads, company names, or source metadata.
 */
export function prepareJobText(job: JobIntelligenceJobInput): PreparedJobText {
  const title = asText(job.title);
  const description = job.description == null ? "" : asText(job.description);
  const titlePrepared = tidyJobText(title);
  const descriptionPrepared = tidyJobText(description);

  return {
    title,
    titlePrepared,
    description: description === "" ? null : description,
    descriptionPrepared: descriptionPrepared === "" ? null : descriptionPrepared,
    analysisText: [titlePrepared, descriptionPrepared].filter(Boolean).join("\n\n"),
  };
}
