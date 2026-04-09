import { createHash, randomUUID } from "node:crypto";
import { parse } from "csv-parse/sync";
import type { AccountType, Classification, ReviewStatus } from "@/lib/constants";

const NAB_HEADER = [
  "Date",
  "Amount",
  "Account Number",
  "",
  "Transaction Type",
  "Transaction Details",
  "Balance",
  "Category",
  "Merchant Name",
  "Processed On",
] as const;

const MONTHS = new Map([
  ["jan", 0],
  ["january", 0],
  ["feb", 1],
  ["february", 1],
  ["mar", 2],
  ["march", 2],
  ["apr", 3],
  ["april", 3],
  ["may", 4],
  ["jun", 5],
  ["june", 5],
  ["jul", 6],
  ["july", 6],
  ["aug", 7],
  ["august", 7],
  ["sep", 8],
  ["sept", 8],
  ["september", 8],
  ["oct", 9],
  ["october", 9],
  ["nov", 10],
  ["november", 10],
  ["dec", 11],
  ["december", 11],
]);

export type ImportSkipReason = {
  rowNumber: number;
  reason: string;
};

export type NormalizedTransactionCandidate = {
  id: string;
  sourceRowNumber: number;
  date: string;
  processedOn: string | null;
  amountCents: number;
  accountType: AccountType;
  transactionType: string | null;
  transactionDetails: string;
  merchantName: string | null;
  nabCategory: string | null;
  classification: Classification | null;
  reviewStatus: ReviewStatus;
  exclusionReason: string | null;
  dedupHash: string;
  rawRowJson: string;
};

function normalizeText(value?: string | null) {
  const normalized = value?.replace(/\s+/g, " ").trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

function normalizeForHash(value?: string | null) {
  return (normalizeText(value) ?? "").toLowerCase();
}

function toIsoDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month ||
    date.getUTCDate() !== day
  ) {
    throw new Error("Invalid date.");
  }

  return date.toISOString().slice(0, 10);
}

export function parseNabDate(value: string) {
  const match = value.trim().match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{2,4})$/);
  if (!match) {
    throw new Error(`Invalid NAB date: ${value}`);
  }

  const day = Number(match[1]);
  const month = MONTHS.get(match[2].toLowerCase());
  if (month === undefined) {
    throw new Error(`Unknown month in date: ${value}`);
  }

  let year = Number(match[3]);
  if (year < 100) {
    year += 2000;
  }

  return toIsoDate(year, month, day);
}

export function parseAmountToCents(value: string) {
  const normalized = value.trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error(`Invalid amount: ${value}`);
  }

  const sign = normalized.startsWith("-") ? -1 : 1;
  const unsigned = normalized.replace("-", "");
  const [whole, fractional = ""] = unsigned.split(".");
  const cents = Number(whole) * 100 + Number((fractional + "00").slice(0, 2));

  return sign * cents;
}

function buildDedupHash(input: {
  date: string;
  amountCents: number;
  transactionType: string | null;
  transactionDetails: string;
  merchantName: string | null;
  processedOn: string | null;
  balance: string | null;
}) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        date: input.date,
        amountCents: input.amountCents,
        transactionType: normalizeForHash(input.transactionType),
        transactionDetails: normalizeForHash(input.transactionDetails),
        merchantName: normalizeForHash(input.merchantName),
        processedOn: input.processedOn ?? "",
        balance: normalizeForHash(input.balance),
      }),
    )
    .digest("hex");
}

function isInformationalZeroRow(input: {
  amountCents: number;
  transactionType: string | null;
  transactionDetails: string | null;
}) {
  return (
    input.amountCents === 0 &&
    (!input.transactionType ||
      /please note/i.test(input.transactionDetails ?? "") ||
      !input.transactionDetails)
  );
}

export function parseNabCsv(args: {
  accountType: AccountType;
  csvText: string;
}) {
  const records = parse(args.csvText, {
    bom: true,
    relax_quotes: true,
    skip_empty_lines: true,
  }) as string[][];

  if (records.length === 0) {
    throw new Error("The CSV file is empty.");
  }

  const header = records[0];
  if (
    header.length !== NAB_HEADER.length ||
    header.some((cell, index) => cell.trim() !== NAB_HEADER[index])
  ) {
    throw new Error(
      "Unexpected NAB CSV header. Expected Date, Amount, Account Number, blank column, Transaction Type, Transaction Details, Balance, Category, Merchant Name, Processed On.",
    );
  }

  const rows: NormalizedTransactionCandidate[] = [];
  const skippedRows: ImportSkipReason[] = [];

  for (const [index, record] of records.slice(1).entries()) {
    const rowNumber = index + 2;
    if (record.length < NAB_HEADER.length) {
      skippedRows.push({ rowNumber, reason: "Row is missing columns." });
      continue;
    }

    try {
      const date = parseNabDate(record[0]);
      const amountCents = parseAmountToCents(record[1]);
      const transactionType = normalizeText(record[4]);
      const transactionDetails = normalizeText(record[5]);
      const merchantName = normalizeText(record[8]);
      const nabCategory = normalizeText(record[7]);
      const processedOn = normalizeText(record[9]) ? parseNabDate(record[9]) : null;
      const balance = normalizeText(record[6]);

      if (!transactionDetails) {
        skippedRows.push({ rowNumber, reason: "Transaction details are required." });
        continue;
      }

      if (
        isInformationalZeroRow({
          amountCents,
          transactionType,
          transactionDetails,
        })
      ) {
        skippedRows.push({
          rowNumber,
          reason: "Informational zero-value notice skipped.",
        });
        continue;
      }

      rows.push({
        id: randomUUID(),
        sourceRowNumber: rowNumber,
        date,
        processedOn,
        amountCents,
        accountType: args.accountType,
        transactionType,
        transactionDetails,
        merchantName,
        nabCategory,
        classification: null,
        reviewStatus: "UNREVIEWED",
        exclusionReason: null,
        dedupHash: buildDedupHash({
          date,
          amountCents,
          transactionType,
          transactionDetails,
          merchantName,
          processedOn,
          balance,
        }),
        rawRowJson: JSON.stringify({
          rowNumber,
          row: {
            Date: record[0],
            Amount: record[1],
            "Account Number": record[2],
            blank: record[3],
            "Transaction Type": record[4],
            "Transaction Details": record[5],
            Balance: record[6],
            Category: record[7],
            "Merchant Name": record[8],
            "Processed On": record[9],
          },
        }),
      });
    } catch (error) {
      skippedRows.push({
        rowNumber,
        reason: error instanceof Error ? error.message : "Unable to parse row.",
      });
    }
  }

  return {
    totalRows: records.length - 1,
    rows,
    skippedRows,
  };
}
