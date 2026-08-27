const MERGE_LINE =
  /^\s*\/\/\s*(Merged on\b|Following fields were not transferred)/i;

export function visibleCustomerNote(raw: string | undefined): string {
  if (!raw) return "";
  return raw
    .split(/\r?\n/)
    .map((line) => line.replace(/\/\/\s*Merged on\b.*$/i, "").trimEnd())
    .filter((line) => line.trim() !== "" && !MERGE_LINE.test(line))
    .join("\n")
    .trim();
}
