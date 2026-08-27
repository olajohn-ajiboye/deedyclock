export const SQUARE_CUSTOMER_NOTE_MAX = 2000;

export interface SquareCustomerRecord {
  squareId: string;
  name: string;
  phone?: string;
  email?: string;
  note: string;
  version: number;
}

export function mapSquareCustomer(value: unknown): SquareCustomerRecord {
  if (!value || typeof value !== "object") {
    throw new Error("Square customer is invalid");
  }
  const customer = value as Record<string, unknown>;
  if (typeof customer.id !== "string" || customer.id === "") {
    throw new Error("Square customer has invalid id");
  }
  if (typeof customer.version !== "number" || !Number.isSafeInteger(customer.version)) {
    throw new Error(`Square customer ${customer.id} has invalid version`);
  }

  const name =
    [customer.given_name, customer.family_name].filter((part) => typeof part === "string" && part).join(" ").trim() ||
    (typeof customer.company_name === "string" && customer.company_name) ||
    (typeof customer.nickname === "string" && customer.nickname) ||
    (typeof customer.email_address === "string" && customer.email_address) ||
    (typeof customer.phone_number === "string" && customer.phone_number) ||
    "Unnamed client";

  return {
    squareId: customer.id,
    name,
    phone: typeof customer.phone_number === "string" ? customer.phone_number : undefined,
    email: typeof customer.email_address === "string" ? customer.email_address : undefined,
    note: typeof customer.note === "string" ? customer.note : "",
    version: customer.version,
  };
}

export function parseUpdateCustomerNoteRequest(value: unknown): {
  squareId: string;
  note: string;
  version: number;
} {
  if (!value || typeof value !== "object") {
    throw new Error("Customer note update is invalid");
  }
  const body = value as Record<string, unknown>;
  if (typeof body.squareId !== "string" || body.squareId === "") {
    throw new Error("Customer note update has invalid squareId");
  }
  if (typeof body.note !== "string") {
    throw new Error("Customer note update has invalid note");
  }
  if (body.note.length > SQUARE_CUSTOMER_NOTE_MAX) {
    throw new Error(`Customer notes must be ${SQUARE_CUSTOMER_NOTE_MAX} characters or fewer`);
  }
  if (typeof body.version !== "number" || !Number.isSafeInteger(body.version) || body.version < 0) {
    throw new Error("Customer note update has invalid version");
  }
  return { squareId: body.squareId, note: body.note, version: body.version };
}

export function isUpdateCustomerNoteRequest(value: unknown): boolean {
  return Boolean(value && typeof value === "object" && "squareId" in value);
}

export function parseSquareCustomersResponse(value: unknown): SquareCustomerRecord[] {
  if (!value || typeof value !== "object") {
    throw new Error("Square customers response is invalid");
  }
  const customers = (value as Record<string, unknown>).customers;
  if (!Array.isArray(customers)) {
    throw new Error("Square customers response has no customers collection");
  }
  return customers.map((customer) => {
    if (customer && typeof customer === "object" && "squareId" in customer) {
      const record = customer as Record<string, unknown>;
      if (typeof record.squareId !== "string" || record.squareId === "") {
        throw new Error("Square customer has invalid squareId");
      }
      if (typeof record.name !== "string" || record.name === "") {
        throw new Error(`Square customer ${record.squareId} has invalid name`);
      }
      if (typeof record.version !== "number" || !Number.isSafeInteger(record.version)) {
        throw new Error(`Square customer ${record.squareId} has invalid version`);
      }
      return {
        squareId: record.squareId,
        name: record.name,
        phone: typeof record.phone === "string" ? record.phone : undefined,
        email: typeof record.email === "string" ? record.email : undefined,
        note: typeof record.note === "string" ? record.note : "",
        version: record.version,
      };
    }
    return mapSquareCustomer(customer);
  });
}

export function parseUpdatedSquareCustomerResponse(value: unknown): SquareCustomerRecord {
  if (!value || typeof value !== "object") {
    throw new Error("Square customer update response is invalid");
  }
  const customer = (value as Record<string, unknown>).customer;
  if (customer && typeof customer === "object" && "squareId" in customer) {
    const [parsed] = parseSquareCustomersResponse({ customers: [customer] });
    return parsed;
  }
  if (customer && typeof customer === "object" && "id" in customer) {
    return mapSquareCustomer(customer);
  }
  throw new Error("Square customer update response has no customer");
}
