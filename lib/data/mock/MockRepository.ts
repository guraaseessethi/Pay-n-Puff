import type { DataRepository } from "@/lib/data/repository";
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
import { IdCheckInput as IdCheckInputSchema } from "@/lib/domain/types";
import { evaluateIdCheck, summariseIdCheck } from "@/lib/compliance/idCheck";
import { sellable } from "@/lib/compliance/sellable";
import { assertTransition } from "@/lib/delivery/status";
import { splitLines, splitTaxIn } from "@/lib/money";

/**
 * Phase 1 repository: sample data + localStorage, so the owner can tap from the shop to the
 * back office to the driver view on one phone and see the same order move through.
 * Not shared between devices. Phase 2 replaces this with Supabase behind the same interface.
 */

export interface DemoSeed {
  products: Product[];
  orders?: Order[];
  holds?: Hold[];
  sales?: Sale[];
  idChecks?: IdCheck[];
  wholesale?: WholesaleRequest[];
}

export interface DemoState {
  v: 2;
  seeded: boolean;
  products: Product[];
  orders: Order[];
  holds: Hold[];
  sales: Sale[];
  idChecks: IdCheck[];
  wholesale: WholesaleRequest[];
  quotes: WholesaleQuote[];
  customers: VerifiedCustomer[];
  checklist: Record<string, boolean>;
  outbox: OutboxMessage[];
  audit: AuditEntry[];
  seq: { order: number; hold: number; n: number };
}

export interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

export const STORAGE_KEY = "pnp-demo-v2";

export const DEFAULT_CHECKLIST: Record<string, boolean> = {
  signs: true,
  hidden: true,
  sign: true,
  stamps: false,
  bags: true,
  two: false,
  testing: true,
  reg: true,
};

function empty(): DemoState {
  return {
    v: 2,
    seeded: false,
    products: [],
    orders: [],
    holds: [],
    sales: [],
    idChecks: [],
    wholesale: [],
    quotes: [],
    customers: [],
    checklist: { ...DEFAULT_CHECKLIST },
    outbox: [],
    audit: [],
    seq: { order: 119, hold: 22, n: 1 },
  };
}

export class MockRepository implements DataRepository {
  private state: DemoState;
  private listeners = new Set<() => void>();

  constructor(
    private kv: KV,
    seed?: DemoSeed,
  ) {
    this.state = this.load();
    if (seed) this.merge(seed);
  }

  /* ---------- store plumbing ---------- */

  private load(): DemoState {
    try {
      const raw = this.kv.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw) as DemoState;
        if (s && s.v === 2) return { ...empty(), ...s };
      }
    } catch {
      /* corrupt or blocked storage: start fresh */
    }
    return empty();
  }

  /**
   * Bring in what the server sent. Products: update descriptive fields, keep local stock.
   * Activity seeds (orders, checks…) only on first run, so demo actions aren't overwritten.
   */
  merge(seed: DemoSeed): void {
    const bySku = new Map(this.state.products.map((p) => [p.sku, p]));
    for (const p of seed.products) {
      const existing = bySku.get(p.sku);
      bySku.set(p.sku, existing ? { ...p, stock: existing.stock } : p);
    }
    this.state.products = [...bySku.values()];
    if (!this.state.seeded && seed.orders) {
      this.state.orders = [...seed.orders, ...this.state.orders];
      this.state.holds = [...(seed.holds ?? []), ...this.state.holds];
      this.state.sales = [...(seed.sales ?? []), ...this.state.sales];
      this.state.idChecks = [...(seed.idChecks ?? []), ...this.state.idChecks];
      this.state.wholesale = [...this.state.wholesale, ...(seed.wholesale ?? [])];
      this.state.seeded = true;
    }
    this.commit(false);
  }

  private commit(notify = true): void {
    try {
      this.kv.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      /* storage full or blocked: keep working in memory */
    }
    if (notify) this.emit();
  }

  private emit(): void {
    for (const l of this.listeners) l();
  }

  /** Re-read storage (another tab changed it). */
  reload(): void {
    this.state = this.load();
    this.emit();
  }

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getSnapshot = (): DemoState => this.state;

  reset(seed?: DemoSeed): void {
    this.kv.removeItem(STORAGE_KEY);
    this.state = empty();
    if (seed) this.merge(seed);
    this.emit();
  }

  private id(prefix: string): string {
    this.state.seq.n += 1;
    return `${prefix}-${Date.now().toString(36)}${this.state.seq.n}`;
  }

  private mutate(fn: (s: DemoState) => void): void {
    // Immutable top-level swap so React snapshots change identity.
    const next: DemoState = structuredClone(this.state);
    fn(next);
    this.state = next;
    this.commit();
  }

  private product(s: DemoState, sku: string): Product {
    const p = s.products.find((x) => x.sku === sku);
    if (!p) throw new Error(`Unknown product ${sku}`);
    return p;
  }

  private adjustStock(s: DemoState, lines: OrderLine[], sign: 1 | -1): void {
    for (const l of lines) {
      const p = s.products.find((x) => x.sku === l.sku);
      if (p) p.stock = Math.max(0, p.stock + sign * l.qty);
    }
  }

  private findOrder(s: DemoState, code: string): Order {
    const o = s.orders.find((x) => x.code === code);
    if (!o) throw new Error(`No order ${code}`);
    return o;
  }

  /* ---------- products ---------- */

  async listProducts() {
    return this.state.products;
  }

  async receiveStock(sku: string, qty: number, by: string) {
    if (!Number.isInteger(qty) || qty < 1) throw new Error("Quantity must be a whole number");
    this.mutate((s) => {
      const p = this.product(s, sku);
      p.stock += qty;
      s.audit.unshift({ id: this.id("A"), at: new Date().toISOString(), who: by, what: `Received ${qty} × ${p.brand} ${p.name}` });
    });
  }

  /* ---------- orders ---------- */

  async listOrders() {
    return this.state.orders;
  }

  async createDeliveryOrder(o: Omit<Order, "id" | "code" | "status" | "driver" | "eta" | "createdAt">): Promise<Order> {
    let created!: Order;
    this.mutate((s) => {
      for (const l of o.lines) {
        const p = this.product(s, l.sku);
        if (!sellable(p)) throw new Error(`${l.sku} can't be sold`);
        if (p.stock < l.qty) throw new Error(`Only ${p.stock} × ${p.brand} ${p.name} left`);
      }
      const code = `PNP-${s.seq.order++}`;
      created = { ...o, id: code, code, status: "Booked", driver: null, eta: null, createdAt: new Date().toISOString() };
      s.orders.unshift(created);
      // Reserve stock now; a Returned order puts it back.
      this.adjustStock(s, o.lines, -1);
    });
    return created;
  }

  private transition(code: string, to: Order["status"], patch: Partial<Order> = {}): Order {
    let out!: Order;
    this.mutate((s) => {
      const o = this.findOrder(s, code);
      assertTransition(o.status, to);
      Object.assign(o, patch, { status: to });
      out = o;
    });
    return out;
  }

  async assignDriver(code: string, driver: string) {
    if (!driver) throw new Error("Pick a driver");
    return this.transition(code, "Boarding", { driver });
  }

  async takeOff(code: string) {
    const eta = new Date(Date.now() + 25 * 60_000);
    return this.transition(code, "In flight", {
      eta: `${String(eta.getHours()).padStart(2, "0")}:${String(eta.getMinutes()).padStart(2, "0")}`,
    });
  }

  async arriveAtDoor(code: string) {
    return this.transition(code, "At the door");
  }

  async recordDoorCheck(code: string, raw: IdCheckInput, minAge: number) {
    const input = IdCheckInputSchema.parse({ ...raw, where: "door", orderCode: code });
    let order!: Order;
    let check!: IdCheck;
    this.mutate((s) => {
      const o = this.findOrder(s, code);
      if (o.status === "In flight") o.status = "At the door";
      if (o.status !== "At the door") throw new Error(`${code} isn't at the door`);
      const d = evaluateIdCheck(input, minAge);
      check = { ...input, id: this.id("ID"), at: new Date().toISOString(), result: d.result, reason: d.reason ?? input.reason };
      s.idChecks.push(check);
      if (d.result === "Pass") {
        o.status = "Landed";
        o.outcome = summariseIdCheck(check);
        const split = splitTaxIn(o.totalCents);
        s.sales.push({
          id: this.id("S"),
          at: check.at,
          channel: "delivery",
          lines: o.lines,
          ...split,
          paymentMethod: o.paymentMethod,
          idCheckId: check.id,
          idSummary: o.outcome,
        });
      } else {
        o.status = "Returned";
        o.outcome = check.reason ?? "Refused at door";
        if (!o.restocked) {
          this.adjustStock(s, o.lines, 1);
          o.restocked = true;
        }
      }
      order = o;
    });
    return { order, check };
  }

  async returnOrder(code: string, reason: string, by: string) {
    let out!: Order;
    this.mutate((s) => {
      const o = this.findOrder(s, code);
      assertTransition(o.status, "Returned");
      o.status = "Returned";
      o.outcome = reason;
      if (!o.restocked) {
        this.adjustStock(s, o.lines, 1);
        o.restocked = true;
      }
      s.audit.unshift({ id: this.id("A"), at: new Date().toISOString(), who: by, what: `${code} returned: ${reason}` });
      out = o;
    });
    return out;
  }

  /* ---------- holds ---------- */

  async listHolds() {
    return this.state.holds;
  }

  async createHold(h: Omit<Hold, "id" | "code" | "createdAt" | "status">) {
    let created!: Hold;
    this.mutate((s) => {
      for (const l of h.lines) {
        const p = this.product(s, l.sku);
        if (!sellable(p)) throw new Error(`${l.sku} can't be sold`);
        if (p.stock < l.qty) throw new Error(`Only ${p.stock} × ${p.brand} ${p.name} left`);
      }
      created = { ...h, id: this.id("H"), code: `HLD-${s.seq.hold++}`, createdAt: new Date().toISOString(), status: "Held" };
      s.holds.push(created);
      this.adjustStock(s, h.lines, -1);
    });
    return created;
  }

  async setHoldStatus(id: string, status: Hold["status"]) {
    this.mutate((s) => {
      const h = s.holds.find((x) => x.id === id);
      if (!h) throw new Error("No such hold");
      if (h.status !== "Held") throw new Error("Hold already closed");
      h.status = status;
      if (status === "Expired" || status === "Cancelled") this.adjustStock(s, h.lines, 1);
    });
  }

  /* ---------- counter ---------- */

  async recordCounterCheck(raw: IdCheckInput, minAge: number) {
    const input = IdCheckInputSchema.parse({ ...raw, where: "counter" });
    const d = evaluateIdCheck(input, minAge);
    const check: IdCheck = { ...input, id: this.id("ID"), at: new Date().toISOString(), result: d.result, reason: d.reason ?? input.reason };
    this.mutate((s) => {
      s.idChecks.push(check);
    });
    return check;
  }

  async completeSale(lines: OrderLine[], payment: PaymentMethod, idCheckId: string, holdId?: string) {
    let sale!: Sale;
    this.mutate((s) => {
      const check = s.idChecks.find((c) => c.id === idCheckId);
      // Mirrors the Phase 2 DB constraint: no sale without a linked passing ID check.
      if (!check || check.result !== "Pass" || check.where !== "counter") throw new Error("A passing age check is required before payment");
      if (!lines.length) throw new Error("Nothing on the ticket");
      const hold = holdId ? s.holds.find((h) => h.id === holdId) : undefined;
      if (holdId && (!hold || hold.status !== "Held")) throw new Error("That hold isn't open");
      for (const l of lines) {
        const p = this.product(s, l.sku);
        if (!sellable(p)) throw new Error(`${p.brand} ${p.name} is blocked from sale`);
        if (!hold && p.stock < l.qty) throw new Error(`Only ${p.stock} × ${p.brand} ${p.name} on hand`);
      }
      if (hold) hold.status = "Picked up";
      else this.adjustStock(s, lines, -1);
      sale = {
        id: this.id("S"),
        at: new Date().toISOString(),
        channel: "counter",
        lines,
        ...splitLines(lines),
        paymentMethod: payment,
        idCheckId,
        idSummary: summariseIdCheck(check),
      };
      s.sales.push(sale);
    });
    return sale;
  }

  async listSales() {
    return this.state.sales;
  }

  /* ---------- compliance ---------- */

  async listIdChecks() {
    return this.state.idChecks;
  }

  async getChecklist() {
    return this.state.checklist;
  }

  async setChecklistItem(key: string, done: boolean) {
    this.mutate((s) => {
      s.checklist[key] = done;
    });
  }

  /* ---------- customers ---------- */

  async addVerifiedCustomer(c: Omit<VerifiedCustomer, "id">) {
    const created = { ...c, id: this.id("C") };
    this.mutate((s) => {
      s.customers.unshift(created);
    });
    return created;
  }

  async listCustomers() {
    return this.state.customers;
  }

  /* ---------- wholesale ---------- */

  async listWholesale() {
    return this.state.wholesale;
  }

  async addWholesaleRequest(input: WholesaleRequestInput) {
    const req: WholesaleRequest = {
      id: this.id("W"),
      createdAt: new Date().toISOString(),
      retailer: {
        id: this.id("R"),
        business: input.business,
        type: input.storeType,
        city: input.city,
        contactName: input.contactName,
        email: input.email,
        phone: input.phone,
        registrationStatus: "Unchecked",
        registrationCheck: null,
      },
      asking: input.asking || "Consultation",
      quoteStatus: "New",
    };
    this.mutate((s) => {
      s.wholesale.unshift(req);
    });
    return req;
  }

  async recordRegistrationCheck(requestId: string, check: RegistrationCheck, passed: boolean) {
    if (!check.method.trim()) throw new Error("Record how the registration was checked");
    this.mutate((s) => {
      const r = s.wholesale.find((w) => w.id === requestId);
      if (!r) throw new Error("No such request");
      r.retailer.registrationStatus = passed ? "Verified" : "Failed";
      r.retailer.registrationCheck = check;
    });
  }

  async saveQuote(q: Omit<WholesaleQuote, "id" | "createdAt">) {
    const quote: WholesaleQuote = { ...q, id: this.id("Q"), createdAt: new Date().toISOString() };
    this.mutate((s) => {
      s.quotes.unshift(quote);
      const r = s.wholesale.find((w) => w.id === q.requestId);
      if (r) r.quoteStatus = "Sent";
    });
    return quote;
  }

  async listQuotes() {
    return this.state.quotes;
  }

  /* ---------- outbox + audit ---------- */

  async send(msg: Omit<OutboxMessage, "id" | "at">) {
    const m: OutboxMessage = { ...msg, id: this.id("M"), at: new Date().toISOString() };
    this.mutate((s) => {
      s.outbox.unshift(m);
    });
    return m;
  }

  async listOutbox() {
    return this.state.outbox;
  }

  async audit(who: string, what: string) {
    this.mutate((s) => {
      s.audit.unshift({ id: this.id("A"), at: new Date().toISOString(), who, what });
    });
  }

  async listAudit() {
    return this.state.audit;
  }
}

/** In-memory KV for tests and for browsers that block storage. */
export class MemoryKV implements KV {
  private m = new Map<string, string>();
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}
