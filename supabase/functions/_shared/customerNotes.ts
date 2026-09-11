const MERGE_LINE =
  /^\s*\/\/\s*(Merged on\b|Following fields were not transferred)/i;
const TRANSFERRED_FIELD =
  /^(First Name|Last Name|Surname|Nickname|Company Name|Email Address|Phone Number|Time Zone|Address|Address Line 1|Address Line 2|City|State|Postal Code|Country)\s*:/i;

function leftoverLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => MERGE_LINE.test(line) || TRANSFERRED_FIELD.test(line.trim()));
}

export function visibleCustomerNote(raw: string | undefined): string {
  if (!raw) return "";
  const hasMerge = raw.split(/\r?\n/).some((line) => MERGE_LINE.test(line));
  return raw
    .split(/\r?\n/)
    .map((line) => line.replace(/\/\/\s*Merged on\b.*$/i, "").trimEnd())
    .filter((line) => {
      const trimmed = line.trim();
      if (trimmed === "" || MERGE_LINE.test(trimmed)) return false;
      if (hasMerge && TRANSFERRED_FIELD.test(trimmed)) return false;
      return true;
    })
    .join("\n")
    .trim();
}

export function squareNoteForUpdate(visible: string, rawFromSquare: string | undefined): string {
  const leftover = leftoverLines(rawFromSquare ?? "").join("\n").trim();
  const next = visible.trim();
  if (!leftover) return next;
  if (!next) return leftover;
  return `${next}\n${leftover}`;
}
