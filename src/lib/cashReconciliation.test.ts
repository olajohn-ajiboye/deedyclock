import { describe, expect, it } from "vitest";
import {
  buildCashDayRows,
  getCashPeriodRange,
  localDayKey,
} from "./cashReconciliation";

describe("getCashPeriodRange", () => {
  it("uses Monday as the start of a week", () => {
    const range = getCashPeriodRange("week", new Date(2026, 7, 20));
    expect(new Date(range.beginTime)).toEqual(startOfLocalMonday());
    expect(range.endTime).toBe(new Date(2026, 7, 24).toISOString());
  });

  it("uses a single local day", () => {
    const range = getCashPeriodRange("day", new Date(2026, 7, 20, 15));
    expect(range.beginTime).toBe(new Date(2026, 7, 20).toISOString());
    expect(range.endTime).toBe(new Date(2026, 7, 21).toISOString());
  });
});

function startOfLocalMonday() {
  // Thursday Aug 20 2026 → week of Monday Aug 17
  return new Date(2026, 7, 17);
}

describe("buildCashDayRows", () => {
  const range = getCashPeriodRange("week", new Date(2026, 7, 20));

  it("aggregates a week into one row of revenue minus cash minus payout", () => {
    const rows = buildCashDayRows(
      [
        {
          createdAt: "2026-08-20T12:00:00",
          paidAmountMinor: 10_000,
          tipAmountMinor: 2_000,
          productAmountMinor: 1_500,
        },
        {
          createdAt: "2026-08-20T18:00:00",
          paidAmountMinor: 2_000,
          tipAmountMinor: 0,
          productAmountMinor: 0,
        },
      ],
      { "2026-08-20": { cashMinor: 10_000, payoutMinor: 3_000 } },
      "week",
      range,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      revenueMinor: 15_500,
      cashMinor: 10_000,
      payoutMinor: 3_000,
      differenceMinor: 2_500,
      cashEditable: false,
    });
  });

  it("keeps a day row editable", () => {
    const dayRange = getCashPeriodRange("day", new Date(2026, 7, 20));
    const rows = buildCashDayRows(
      [
        {
          createdAt: "2026-08-20T12:00:00",
          paidAmountMinor: 10_000,
          tipAmountMinor: 2_000,
          productAmountMinor: 0,
        },
      ],
      { [localDayKey(new Date(2026, 7, 20))]: { cashMinor: 4_000, payoutMinor: 2_000 } },
      "day",
      dayRange,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      revenueMinor: 12_000,
      cashMinor: 4_000,
      payoutMinor: 2_000,
      differenceMinor: 6_000,
      cashEditable: true,
    });
  });

  it("aggregates a year into one row", () => {
    const yearRange = getCashPeriodRange("year", new Date(2026, 7, 20));
    const rows = buildCashDayRows(
      [
        {
          createdAt: new Date(2026, 7, 20, 12).toISOString(),
          paidAmountMinor: 1_000,
          tipAmountMinor: 0,
          productAmountMinor: 0,
        },
      ],
      { [localDayKey(new Date(2026, 0, 3))]: { cashMinor: 500, payoutMinor: 200 } },
      "year",
      yearRange,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      revenueMinor: 1_000,
      cashMinor: 500,
      payoutMinor: 200,
      differenceMinor: 300,
      cashEditable: false,
    });
  });
});
