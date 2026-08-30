import { describe, expect, it } from "vitest";
import {
  catalogPriceFromObject,
  normalizeSquareBooking,
  squareBookingSearchWindows,
} from "../../supabase/functions/_shared/paymentReport";
import { buildPaymentReport, dollarsToMinor, getPaymentRange } from "./paymentReport";
import { parseSquareBookedAppointmentsResponse } from "./squarePayments";

describe("normalizeSquareBooking", () => {
  const catalog = new Map([
    [
      "service-1",
      { amount: 10_000, currency: "CAD", name: "Retwist", unpriced: false },
    ],
    [
      "service-2",
      { amount: 5_000, currency: "CAD", name: "Wash", unpriced: false },
    ],
  ]);

  it("sums booked service catalog prices and skips cancelled appointments", () => {
    expect(
      normalizeSquareBooking(
        {
          id: "booking-1",
          status: "ACCEPTED",
          start_at: "2026-08-10T18:30:00Z",
          customer_id: "customer-1",
          appointment_segments: [
            { service_variation_id: "service-1" },
            { service_variation_id: "service-2" },
          ],
        },
        catalog,
      ),
    ).toEqual({
      id: "booking-1",
      customerId: "customer-1",
      createdAt: "2026-08-10T18:30:00Z",
      amountMinor: 15_000,
      currency: "CAD",
      serviceNames: ["Retwist", "Wash"],
      unpriced: false,
    });

    expect(
      normalizeSquareBooking(
        { id: "cancelled", status: "CANCELLED_BY_CUSTOMER", start_at: "2026-08-10T18:30:00Z" },
        catalog,
      ),
    ).toBeNull();
  });

  it("keeps appointments with unpriced catalog services instead of failing the month", () => {
    expect(
      normalizeSquareBooking(
        {
          id: "booking-1",
          status: "ACCEPTED",
          start_at: "2026-08-10T18:30:00Z",
          appointment_segments: [
            { service_variation_id: "service-1" },
            { service_variation_id: "missing-service" },
          ],
        },
        catalog,
      ),
    ).toEqual({
      id: "booking-1",
      customerId: null,
      createdAt: "2026-08-10T18:30:00Z",
      amountMinor: 10_000,
      currency: "CAD",
      serviceNames: ["Retwist", "No catalog price"],
      unpriced: true,
    });
  });
});

describe("catalogPriceFromObject", () => {
  it("treats variable-priced catalog services as unpriced instead of throwing", () => {
    expect(
      catalogPriceFromObject({
        id: "XC4JGCBQVFD7DHOKUHFD455Z",
        type: "ITEM_VARIATION",
        item_variation_data: {
          name: "Custom service",
          pricing_type: "VARIABLE_PRICING",
        },
      }),
    ).toEqual({
      amount: 0,
      currency: null,
      name: "Custom service",
      unpriced: true,
    });
  });
});

describe("buildPaymentReport", () => {
  const appointments = [
    {
      id: "b1",
      customerId: "c1",
      createdAt: "2026-08-01T10:00:00Z",
      amountMinor: 10_000,
      currency: "CAD",
      serviceNames: ["Retwist"],
      unpriced: false,
    },
    {
      id: "b2",
      customerId: "c1",
      createdAt: "2026-08-02T10:00:00Z",
      amountMinor: 5_000,
      currency: "CAD",
      serviceNames: ["Wash"],
      unpriced: false,
    },
    {
      id: "b3",
      customerId: null,
      createdAt: "2026-08-02T12:00:00Z",
      amountMinor: 2_500,
      currency: "CAD",
      serviceNames: ["Consultation"],
      unpriced: false,
    },
  ];

  it("itemizes booked appointments with customer names and service labels", () => {
    const report = buildPaymentReport(appointments, [{ squareId: "c1", name: "Ada" }], "month");

    expect(report.totalAmountMinor).toBe(17_500);
    expect(report.totalPaidMinor).toBe(17_500);
    expect(report.totalTipMinor).toBe(0);
    expect(report.totalProductMinor).toBe(0);
    expect(report.paymentCount).toBe(3);
    expect(report.items).toEqual([
      {
        id: "b3",
        customerId: null,
        customerName: "Appointment without a customer",
        createdAt: "2026-08-02T12:00:00Z",
        catalogAmountMinor: 2_500,
        paidAmountMinor: 2_500,
        tipAmountMinor: 0,
        productAmountMinor: 0,
        amountMinor: 2_500,
        serviceNames: ["Consultation"],
        unpriced: false,
      },
      {
        id: "b2",
        customerId: "c1",
        customerName: "Ada",
        createdAt: "2026-08-02T10:00:00Z",
        catalogAmountMinor: 5_000,
        paidAmountMinor: 5_000,
        tipAmountMinor: 0,
        productAmountMinor: 0,
        amountMinor: 5_000,
        serviceNames: ["Wash"],
        unpriced: false,
      },
      {
        id: "b1",
        customerId: "c1",
        customerName: "Ada",
        createdAt: "2026-08-01T10:00:00Z",
        catalogAmountMinor: 10_000,
        paidAmountMinor: 10_000,
        tipAmountMinor: 0,
        productAmountMinor: 0,
        amountMinor: 10_000,
        serviceNames: ["Retwist"],
        unpriced: false,
      },
    ]);
  });

  it("never combines appointments in different currencies", () => {
    expect(() =>
      buildPaymentReport(
        [appointments[0], { ...appointments[1], id: "usd", currency: "USD" }],
        [],
        "month",
      ),
    ).toThrow("multiple currencies");
  });

  it("uses stored paid amounts and keeps tips separate from the paid total", () => {
    const report = buildPaymentReport(
      appointments,
      [{ squareId: "c1", name: "Ada" }],
      "month",
      {
        b1: { paidAmountMinor: 8_000, tipAmountMinor: 2_000, productAmountMinor: 1_500 },
        b2: { paidAmountMinor: 5_000, tipAmountMinor: 500, productAmountMinor: 0 },
      },
    );

    expect(report.totalPaidMinor).toBe(15_500);
    expect(report.totalTipMinor).toBe(2_500);
    expect(report.totalProductMinor).toBe(1_500);
    expect(report.totalAmountMinor).toBe(19_500);
    expect(report.items[2]).toMatchObject({
      id: "b1",
      catalogAmountMinor: 10_000,
      paidAmountMinor: 8_000,
      tipAmountMinor: 2_000,
      productAmountMinor: 1_500,
      amountMinor: 11_500,
    });
  });

  it("keeps tip totals separate on each day bucket", () => {
    const report = buildPaymentReport(
      appointments,
      [],
      "month",
      {
        b2: { paidAmountMinor: 5_000, tipAmountMinor: 2_000, productAmountMinor: 3_000 },
        b3: { paidAmountMinor: 2_500, tipAmountMinor: 500, productAmountMinor: 0 },
      },
    );
    const augustSecond = report.buckets.find((bucket) => bucket.key.endsWith("08-02"));

    expect(augustSecond).toMatchObject({
      amountMinor: 7_500,
      tipAmountMinor: 2_500,
      productAmountMinor: 3_000,
    });
  });

  it("splits completed-session income from remaining booked totals", () => {
    const report = buildPaymentReport(
      appointments,
      [{ squareId: "c1", name: "Ada" }],
      "month",
      {
        b1: { paidAmountMinor: 8_000, tipAmountMinor: 2_000, productAmountMinor: 0 },
        b2: { paidAmountMinor: 5_000, tipAmountMinor: 0, productAmountMinor: 0 },
      },
      new Set(["b1"]),
    );

    expect(report.completedPaidMinor).toBe(8_000);
    expect(report.totalPaidMinor).toBe(15_500);
    expect(report.completedPaymentCount).toBe(1);
    expect(report.paymentCount).toBe(3);
    expect(report.completedCustomerCount).toBe(1);
    expect(report.customerCount).toBe(1);
  });

  it("groups a month chart by week when the weekly scale is selected", () => {
    const report = buildPaymentReport(
      appointments,
      [],
      "month",
      {},
      new Set(),
      "week",
    );

    expect(report.buckets).toHaveLength(1);
    expect(report.buckets[0]).toMatchObject({
      amountMinor: 17_500,
      tipAmountMinor: 0,
      productAmountMinor: 0,
    });
  });
});

describe("dollarsToMinor", () => {
  it("converts dollar inputs to minor units and treats a blank tip as zero", () => {
    expect(dollarsToMinor("200")).toBe(20_000);
    expect(dollarsToMinor("200.5")).toBe(20_050);
    expect(dollarsToMinor("")).toBe(0);
  });

  it("rejects negative amounts", () => {
    expect(() => dollarsToMinor("-1")).toThrow("invalid amount");
  });
});

describe("squareBookingSearchWindows", () => {
  it("keeps ranges of 31 days or less as a single Square search", () => {
    expect(
      squareBookingSearchWindows("2026-08-01T00:00:00.000Z", "2026-09-01T00:00:00.000Z"),
    ).toEqual([
      { beginTime: "2026-08-01T00:00:00.000Z", endTime: "2026-09-01T00:00:00.000Z" },
    ]);
  });

  it("splits longer ranges into windows Square will accept", () => {
    const windows = squareBookingSearchWindows(
      "2026-01-01T00:00:00.000Z",
      "2026-04-01T00:00:00.000Z",
    );

    expect(windows.length).toBeGreaterThan(1);
    for (const window of windows) {
      const lengthMs = Date.parse(window.endTime) - Date.parse(window.beginTime);
      expect(lengthMs).toBeGreaterThan(0);
      expect(lengthMs).toBeLessThanOrEqual(31 * 24 * 60 * 60 * 1000);
    }
    expect(windows[0].beginTime).toBe("2026-01-01T00:00:00.000Z");
    expect(windows.at(-1)?.endTime).toBe("2026-04-01T00:00:00.000Z");
    for (let i = 1; i < windows.length; i += 1) {
      expect(windows[i].beginTime).toBe(windows[i - 1].endTime);
    }
  });
});

describe("getPaymentRange", () => {
  it("uses an exclusive next-month boundary for month reports", () => {
    const range = getPaymentRange("month", new Date(2026, 7, 15));

    expect(range.beginTime).toBe(new Date(2026, 7, 1).toISOString());
    expect(range.endTime).toBe(new Date(2026, 8, 1).toISOString());
  });

  it("uses an exclusive next-year boundary for yearly reports", () => {
    const range = getPaymentRange("year", new Date(2026, 7, 15));

    expect(range.beginTime).toBe(new Date(2026, 0, 1).toISOString());
    expect(range.endTime).toBe(new Date(2027, 0, 1).toISOString());
  });
});

describe("parseSquareBookedAppointmentsResponse", () => {
  it("rejects an invalid appointment payload instead of displaying partial data", () => {
    expect(() =>
      parseSquareBookedAppointmentsResponse({
        appointments: [
          {
            id: "b1",
            customerId: null,
            createdAt: "not-a-date",
            amountMinor: 1_000,
            currency: "CAD",
            serviceNames: ["Retwist"],
            unpriced: false,
          },
        ],
      }),
    ).toThrow("invalid createdAt");
  });
});
