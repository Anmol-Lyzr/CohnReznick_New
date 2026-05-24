/**
 * Generates PoC trial balance source files.
 * Run from repo root: node scripts/generate-trial-balance-files.mjs
 */
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "../public/documents/trial-balance");
mkdirSync(outDir, { recursive: true });

function monthLabels(startYear, startMonth, count) {
  const labels = [];
  let y = startYear;
  let m = startMonth;
  for (let i = 0; i < count; i++) {
    const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m];
    labels.push(`${mon}-${String(y).slice(-2)}`);
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return labels;
}

function flatRow(code, name, type, periods, values) {
  const row = { account_code: code, account_name: name, account_type: type };
  periods.forEach((p, i) => {
    row[p] = values[i] ?? 0;
  });
  return row;
}

function toSheet(rows, periods) {
  const header = ["account_code", "account_name", "account_type", ...periods];
  const data = [header];
  for (const row of rows) {
    data.push([row.account_code, row.account_name, row.account_type, ...periods.map((p) => row[p])]);
  }
  return data;
}

function writeCsv(filename, rows, periods) {
  const header = ["account_code", "account_name", "account_type", ...periods];
  const lines = [header.join(",")];
  for (const row of rows) {
    const vals = periods.map((p) => String(row[p] ?? 0));
    lines.push([row.account_code, `"${row.account_name}"`, row.account_type, ...vals].join(","));
  }
  writeFileSync(join(outDir, filename), `${lines.join("\n")}\n`, "utf8");
}

function writeXlsx(filename, rows, periods) {
  const ws = XLSX.utils.aoa_to_sheet(toSheet(rows, periods));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Trial Balance");
  XLSX.writeFile(wb, join(outDir, filename));
}

const hzPeriods = monthLabels(2024, 0, 24);
const hzRows = [
  flatRow("4100", "Freight Revenue", "Revenue", hzPeriods, [
    3800, 3720, 3900, 3850, 3920, 3880, 3950, 4010, 4080, 4120, 4050, 3980,
    4020, 3960, 3880, 3820, 3780, 3720, 3680, 3620, 3550, 3480, 3420, 3180,
  ]),
  flatRow("5100", "Fuel & DEF Expense", "OpEx", hzPeriods, [
    420, 425, 430, 435, 440, 445, 460, 475, 490, 505, 520, 535,
    540, 545, 550, 555, 560, 565, 580, 595, 610, 625, 640, 655,
  ]),
  flatRow("1500", "Fleet Assets (Net)", "Asset", hzPeriods, [
    8200, 8180, 8160, 8140, 8120, 8100, 8080, 8060, 8040, 8020, 8800, 8780,
    8760, 8740, 8720, 8700, 8680, 8660, 8640, 8620, 8600, 8580, 8560, 15400,
  ]),
  flatRow("5200", "Fleet Depreciation", "OpEx", hzPeriods, [
    180, 180, 180, 180, 180, 180, 182, 182, 182, 185, 185, 188,
    188, 188, 190, 190, 192, 192, 195, 195, 198, 198, 200, 320,
  ]),
  flatRow("2100", "Accounts Payable", "Liability", hzPeriods, Array(24).fill(1200)),
  flatRow("1100", "Cash", "Asset", hzPeriods, Array(24).fill(950)),
];
writeCsv("TB_Horizon_FY25.csv", hzRows, hzPeriods);

const smPeriods = monthLabels(2025, 0, 15);
const smRows = [
  flatRow("4010", "Same-Store Sales", "Revenue", smPeriods, [
    5200, 5180, 5250, 5300, 5280, 5320, 5350, 5380, 5400, 5420, 5450, 5480, 5500, 5280, 5120,
  ]),
  flatRow("1250", "Inventory", "Asset", smPeriods, [
    8200, 8250, 8300, 8350, 8400, 8450, 8500, 8550, 8600, 8650, 8700, 8750, 8800, 10200, 10600,
  ]),
  flatRow("4020", "E-commerce Revenue", "Revenue", smPeriods, Array(15).fill(1800)),
  flatRow("6100", "Store Payroll", "OpEx", smPeriods, Array(15).fill(2100)),
  flatRow("2200", "Accrued Expenses", "Liability", smPeriods, Array(15).fill(640)),
];
writeXlsx("TB_Summit_Q1-26.xlsx", smRows, smPeriods);

const nbPeriods = monthLabels(2023, 0, 37);
const nbRevenue = Array(37).fill(4200);
nbRevenue[36] = 3500;
const nbCogs = Array(37).fill(2800);
for (let i = 24; i < 36; i++) nbCogs[i] = 2900;
const nbAr = Array(37).fill(2100);
nbAr[35] = 4900;
const nbSga = Array(37).fill(980);
nbSga[34] = 2540;

const nbRows = [
  flatRow("4100", "Revenue", "Revenue", nbPeriods, nbRevenue),
  flatRow("5000", "COGS", "COGS", nbPeriods, nbCogs),
  flatRow("1200", "Accounts Receivable", "Asset", nbPeriods, nbAr),
  flatRow("6300", "SG&A", "OpEx", nbPeriods, nbSga),
  flatRow("1500", "Raw Materials Inventory", "Asset", nbPeriods, Array(37).fill(3200)),
  flatRow("1400", "WIP", "Asset", nbPeriods, Array(37).fill(1100)),
  flatRow("2100", "Accounts Payable", "Liability", nbPeriods, Array(37).fill(1400)),
];
writeXlsx("TB_NorthBridge_36mo.xlsx", nbRows, nbPeriods);

console.log("Wrote trial balance files to", outDir);
