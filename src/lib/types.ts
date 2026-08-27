export type ID = string;

export interface Worker {
  id: ID;
  name: string;
  color: string;
  hourlyRate?: number;
  archived?: boolean;
}

export interface Customer {
  id: ID;
  name: string;
  phone?: string;
  note?: string;
  color: string;
  archived?: boolean;
  squareId?: string;
  email?: string;
  squareVersion?: number;
}

export interface Session {
  id: ID;
  workerId: ID;
  /** Square customer id snapshot (preferred for lookups). */
  customerSquareId: string | null;
  /** Snapshot of the customer's name at the time of the session. */
  customerName: string;
  startAt: number; // ms epoch
  endAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface DBState {
  workers: Worker[];
  customers: Customer[];
  sessions: Session[];
  loaded: boolean;
}
