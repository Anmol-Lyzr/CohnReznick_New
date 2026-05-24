import * as XLSX from "xlsx";

const MAX_PREVIEW_ROWS = 200;

export function buildTrialBalancePreview(
  buffer: Buffer,
  filename: string
): string {
  const lower = filename.toLowerCase();
  let rows: string[][] = [];

  try {
    if (lower.endsWith(".csv")) {
      const text = buffer.toString("utf8");
      rows = text
        .split(/\r?\n/)
        .filter((line) => line.trim())
        .slice(0, MAX_PREVIEW_ROWS + 1)
        .map((line) => parseCsvLine(line));
    } else if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) return "(empty workbook)";
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json<string[]>(sheet, {
        header: 1,
        defval: "",
      }) as string[][];
      rows = data.slice(0, MAX_PREVIEW_ROWS + 1);
    } else {
      return `(unsupported file type: ${filename})`;
    }
  } catch (err) {
    return `(failed to parse ${filename}: ${(err as Error).message})`;
  }

  if (rows.length === 0) return "(no rows parsed)";

  const lines = rows.map((row) =>
    row.map((cell) => String(cell ?? "").replace(/\|/g, "\\|")).join(" | ")
  );
  const truncated = rows.length > MAX_PREVIEW_ROWS;
  return [
    `File: ${filename}`,
    `Rows shown: ${Math.min(rows.length, MAX_PREVIEW_ROWS)}${truncated ? ` (truncated from more)` : ""}`,
    "",
    lines.join("\n"),
  ].join("\n");
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  out.push(current.trim());
  return out;
}
