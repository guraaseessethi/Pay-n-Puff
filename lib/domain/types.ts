import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Products                                                             */
/* ------------------------------------------------------------------ */

export const Stamp = z.enum(["ON", "CA", "none", "n/a"]);
export type Stamp = z.infer<typeof Stamp>;

export const Category = z.enum(["Disposables", "Pods", "Devices"]);
export type Category = z.infer<typeof Category>;

export const FlavourFamilySchema = z.enum(["tobacco", "mint", "menthol", "flavoured", "none"]);

export const Product = z.object({
  sku: z.string().min(1),
  brand: z.string(),
  name: z.string(),
  category: Category,
  /** mg/mL. 0 for hardware with no liquid. */
  nicotineMgMl: z.number().min(0),
  size: z.string(),
  flavourFamily: FlavourFamilySchema,
  /** Shelf price, tax included, integer cents. */
  priceCents: z.number().int().nonnegative(),
  /** Owner-only. Integer cents. */
  costCents: z.number().int().nonnegative(),
  stock: z.number().int(),
  par: z.number().int().nonnegative(),
  stamp: Stamp,
  supplier: z.string(),
  house: z.boolean().default(false),
});
export type Product = z.infer<typeof Product>;

/** What a verified customer or the till may see. No cost, no supplier. */
export type ShelfProduct = Omit<Product, "costCents" | "supplier">;

/* ------------------------------------------------------------------ */
/* Orders, deliveries, holds                                            */
/* ------------------------------------------------------------------ */

export const PaymentMethod = z.enum(["cash", "etransfer", "card"]);
export type PaymentMethod = z.infer<typeof PaymentMethod>;

export const OrderStatus = z.enum(["Booked", "Boarding", "In flight", "At the door", "Landed", "Returned"]);
export type OrderStatus = z.infer<typeof OrderStatus>;

export const OrderLine = z.object({
  sku: z.string(),
  label: z.string(),
  qty: z.number().int().positive(),
  unitCents: z.number().int().nonnegative(),
});
export type OrderLine = z.infer<typeof OrderLine>;

export interface Order {
  id: string;
  /** Flight code shown on the board, e.g. PNP-119. */
  code: string;
  kind: "delivery";
  createdAt: string;
  /** Verified customer's full name. The recipient must be this person. */
  recipientName: string;
  /** "Jordan M." form. The only name a driver sees. */
  recipientShort: string;
  address: string;
  postalCode: string;
  zoneFsa: string;
  window: string;
  paymentMethod: PaymentMethod;
  lines: OrderLine[];
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  preTaxCents: number;
  taxCents: number;
  status: OrderStatus;
  driver: string | null;
  eta: string | null;
  /** Placed by phone/in store for a customer not yet verified online (staff_verified first delivery). */
  firstOrderUnverified?: boolean;
  contact?: string;
  outcome?: string;
  restocked?: boolean;
}

export interface Hold {
  id: string;
  code: string;
  createdAt: string;
  expiresAt: string;
  name: string;
  lines: OrderLine[];
  totalCents: number;
  status: "Held" | "Picked up" | "Expired" | "Cancelled";
}

export interface Sale {
  id: string;
  at: string;
  channel: "counter" | "delivery";
  lines: OrderLine[];
  totalCents: number;
  preTaxCents: number;
  taxCents: number;
  paymentMethod: PaymentMethod;
  idCheckId: string | null;
  idSummary: string;
}

/* ------------------------------------------------------------------ */
/* ID checks (append-only). No ID numbers. No dates of birth.          */
/* ------------------------------------------------------------------ */

export const IdType = z.enum([
  "Driver's licence",
  "Ontario Photo Card",
  "Passport",
  "Permanent resident card",
  "Clearly 25+ (no ID asked)",
  "No ID",
]);
export type IdType = z.infer<typeof IdType>;

export const IdCheckInput = z
  .object({
    where: z.enum(["counter", "door"]),
    staff: z.string().min(1).max(60),
    idType: IdType,
    /** Age in whole years read from the ID. Never the date of birth. */
    age: z.number().int().min(0).max(120).nullable(),
    nameMatches: z.boolean().nullable(),
    orderCode: z.string().max(20).nullable(),
    reason: z.string().max(200).optional(),
    /** Staff chose not to complete the sale/handoff (e.g. intoxicated, wrong person). Always a refusal. */
    refusedByStaff: z.boolean().optional(),
  })
  .strict();
export type IdCheckInput = z.infer<typeof IdCheckInput>;

export interface IdCheck extends IdCheckInput {
  id: string;
  at: string;
  result: "Pass" | "Refused";
}

/* ------------------------------------------------------------------ */
/* Verified customers (Phase 2: `customers`). Result only.             */
/* ------------------------------------------------------------------ */

export interface VerifiedCustomer {
  id: string;
  name: string;
  contact: string;
  verifiedMinAge: number;
  verifiedAt: string;
  expiresAt: string;
  method: "counter" | "door" | "id_provider" | "demo";
  verificationRef: string;
}

/* ------------------------------------------------------------------ */
/* Wholesale                                                           */
/* ------------------------------------------------------------------ */

export const RetailerTypeSchema = z.enum(["specialty", "convenience", "other"]);

export const WholesaleRequestInput = z
  .object({
    business: z.string().trim().min(2).max(120),
    storeType: RetailerTypeSchema,
    city: z.string().trim().min(2).max(80),
    contactName: z.string().trim().min(2).max(80),
    email: z.email().max(160),
    phone: z.string().trim().max(30).optional().default(""),
    asking: z.string().trim().max(1000).optional().default(""),
    registeredConfirmed: z.literal(true, { error: "Please confirm this is a registered retail business." }),
  })
  .strict();
export type WholesaleRequestInput = z.infer<typeof WholesaleRequestInput>;

export type RegistrationStatus = "Unchecked" | "Verified" | "Failed";

export interface RegistrationCheck {
  /** How the registration was checked, e.g. "Called health unit", "Saw registration certificate". */
  method: string;
  checkedAt: string;
  by: string;
  note?: string;
}

export interface Retailer {
  id: string;
  business: string;
  type: z.infer<typeof RetailerTypeSchema>;
  city: string;
  contactName: string;
  email: string;
  phone: string;
  registrationStatus: RegistrationStatus;
  registrationCheck: RegistrationCheck | null;
}

export interface WholesaleRequest {
  id: string;
  createdAt: string;
  retailer: Retailer;
  asking: string;
  quoteStatus: "New" | "Draft" | "Sent";
}

export interface WholesaleQuoteLine {
  sku: string;
  label: string;
  qty: number;
  unitCents: number;
}

export interface WholesaleQuote {
  id: string;
  requestId: string;
  createdAt: string;
  retailerType: Retailer["type"];
  registrationCheck: RegistrationCheck;
  marginPct: number;
  lines: WholesaleQuoteLine[];
  totalCents: number;
}

/* ------------------------------------------------------------------ */
/* Staff, settings, logs                                               */
/* ------------------------------------------------------------------ */

export type StaffRole = "owner" | "counter" | "driver";

export interface Staff {
  id: string;
  name: string;
  role: StaffRole;
}

export interface OutboxMessage {
  id: string;
  at: string;
  channel: "email" | "sms";
  to: string;
  subject: string;
  body: string;
  /** Demo only: a link the owner can tap to see what the customer would get. */
  demoLink?: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  who: string;
  what: string;
}
