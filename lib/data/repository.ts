import type {
  AuditEntry,
  Hold,
  IdCheck,
  IdCheckInput,
  Order,
  OrderLine,
  OutboxMessage,
  PaymentMethod,
  Product,
  RegistrationCheck,
  Sale,
  VerifiedCustomer,
  WholesaleQuote,
  WholesaleRequest,
  WholesaleRequestInput,
} from "@/lib/domain/types";

/**
 * Everything the UI needs from storage. Phase 1: MockRepository (sample data + localStorage).
 * Phase 2: SupabaseRepository implements the same interface; the UI doesn't change.
 * All methods are async so the swap is mechanical.
 */
export interface DataRepository {
  /* products */
  listProducts(): Promise<Product[]>;
  receiveStock(sku: string, qty: number, by: string): Promise<void>;

  /* orders + deliveries */
  listOrders(): Promise<Order[]>;
  createDeliveryOrder(o: Omit<Order, "id" | "code" | "status" | "driver" | "eta" | "createdAt">): Promise<Order>;
  assignDriver(code: string, driver: string): Promise<Order>;
  takeOff(code: string): Promise<Order>;
  arriveAtDoor(code: string): Promise<Order>;
  /** Logs the door check, then lands (pass) or returns + restocks (refused). */
  recordDoorCheck(code: string, input: IdCheckInput, minAge: number): Promise<{ order: Order; check: IdCheck }>;
  returnOrder(code: string, reason: string, by: string): Promise<Order>;

  /* holds */
  listHolds(): Promise<Hold[]>;
  createHold(h: Omit<Hold, "id" | "code" | "createdAt" | "status">): Promise<Hold>;
  setHoldStatus(id: string, status: Hold["status"]): Promise<void>;

  /* counter */
  recordCounterCheck(input: IdCheckInput, minAge: number): Promise<IdCheck>;
  /** holdId: ringing up a pickup hold (stock was already reserved when the hold was made). */
  completeSale(lines: OrderLine[], payment: PaymentMethod, idCheckId: string, holdId?: string): Promise<Sale>;
  listSales(): Promise<Sale[]>;

  /* compliance */
  listIdChecks(): Promise<IdCheck[]>;
  getChecklist(): Promise<Record<string, boolean>>;
  setChecklistItem(key: string, done: boolean): Promise<void>;

  /* customers (staff_verified mode) */
  addVerifiedCustomer(c: Omit<VerifiedCustomer, "id">): Promise<VerifiedCustomer>;
  listCustomers(): Promise<VerifiedCustomer[]>;

  /* wholesale */
  listWholesale(): Promise<WholesaleRequest[]>;
  addWholesaleRequest(input: WholesaleRequestInput): Promise<WholesaleRequest>;
  recordRegistrationCheck(requestId: string, check: RegistrationCheck, passed: boolean): Promise<void>;
  saveQuote(q: Omit<WholesaleQuote, "id" | "createdAt">): Promise<WholesaleQuote>;
  listQuotes(): Promise<WholesaleQuote[]>;

  /* messages + audit */
  send(msg: Omit<OutboxMessage, "id" | "at">): Promise<OutboxMessage>;
  listOutbox(): Promise<OutboxMessage[]>;
  audit(who: string, what: string): Promise<void>;
  listAudit(): Promise<AuditEntry[]>;
}
