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
}

export interface Session {
  id: ID;
  workerId: ID;
  customerId: ID;
  startAt: number; // ms epoch
  endAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface DBState {
  workers: Worker[];
  customers: Customer[];
  sessions: Session[];
}
