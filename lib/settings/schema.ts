import { z } from "zod";
import {
  DEFAULT_HOLD_HOURS,
  DELIVERY_ENABLED,
  MIN_AGE,
  PROMOTIONS_ENABLED,
  RESERVATIONS_ENABLED,
} from "@/lib/compliance/policy";
import { DEFAULT_HOURS, isValidMark, markToMinutes } from "@/lib/hours/hours";

export const AGE_GATE_MODES = ["info_only", "staff_verified", "id_provider", "self_declare"] as const;
export const AgeGateMode = z.enum(AGE_GATE_MODES);
export type AgeGateMode = z.infer<typeof AgeGateMode>;

const Mark = z.string().refine(isValidMark, "Use HH:MM, e.g. 21:00 or 25:00 for 1 am");
const Day = z
  .object({ open: Mark, close: Mark })
  .refine((d) => markToMinutes(d.close) > markToMinutes(d.open), "Close must be after open")
  .nullable();

export const Settings = z.object({
  ageGateMode: AgeGateMode,
  minAge: z.union([z.literal(19), z.literal(21)]),
  deliveryEnabled: z.boolean(),
  reservationsEnabled: z.boolean(),
  /** Locked false until the health unit confirms. Kept in the schema so the switch exists. */
  promotionsEnabled: z.literal(false),
  holdHours: z.number().int().min(1).max(72),
  hours: z.tuple([Day, Day, Day, Day, Day, Day, Day]),
  delivery: z.object({
    /** Postal-code FSAs (first 3 characters) we deliver to. */
    fsas: z.array(z.string().regex(/^[A-Z]\d[A-Z]$/)).max(40),
    feeCents: z.number().int().min(0).max(10000),
    minimumCents: z.number().int().min(0).max(100000),
    /** Delivery hours as day windows (same format as store hours). */
    windows: z.array(z.string().min(3).max(40)).min(1).max(12),
    payment: z.object({ cash: z.boolean(), etransfer: z.boolean() }),
  }),
  /** Who turned on self_declare, and when. Required whenever mode is self_declare. */
  selfDeclareAck: z.object({ by: z.string(), at: z.string() }).nullable(),
});
export type Settings = z.infer<typeof Settings>;

export const DEFAULT_SETTINGS: Settings = {
  ageGateMode: "staff_verified",
  minAge: MIN_AGE === 21 ? 21 : 19,
  deliveryEnabled: DELIVERY_ENABLED,
  reservationsEnabled: RESERVATIONS_ENABLED,
  promotionsEnabled: PROMOTIONS_ENABLED,
  holdHours: DEFAULT_HOLD_HOURS,
  hours: DEFAULT_HOURS,
  delivery: {
    // Sample: central/south Barrie FSAs. Confirm the real zone (docs/CONTENT_TODO.md).
    fsas: ["L4M", "L4N", "L9J"],
    feeCents: 500,
    minimumCents: 3000,
    windows: ["ASAP (about 45 min)", "6 – 8 pm", "8 – 10 pm", "10 pm – 12 am"],
    payment: { cash: true, etransfer: true },
  },
  selfDeclareAck: null,
};
