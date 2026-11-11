/**
 * Public store facts. Safe for anyone to see: no product names, prices, flavours or images.
 * Anything marked verify:true shows a [verify] tag in ?review=1 mode (see docs/CONTENT_TODO.md).
 */

export const STORE = {
  name: "Pay N' Puff Vapes",
  street: "15 Dunlop St E",
  city: "Barrie",
  region: "ON",
  postal: "L4M 1A2",
  country: "CA",
  landmark: "beside 5 Points Barber",
  email: "paynpuffvapes@gmail.com",
  /** No phone on the current site. Leave null until the owner confirms one. */
  phone: null as string | null,
  /** Approximate coordinates for downtown Dunlop St E. [verify] */
  geo: { lat: 44.3894, lng: -79.6863 },
  quitUrl: "https://www.canada.ca/en/health-canada/services/smoking-tobacco/quit-smoking.html",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=15+Dunlop+St+E%2C+Barrie%2C+ON+L4M+1A2",
} as const;

export const ADDRESS_ONE_LINE = `${STORE.street}, ${STORE.city}, ${STORE.region} ${STORE.postal}`;

export const STORE_RULES = (minAge: number) => [
  { b: `${minAge}+ to enter, buy or receive a delivery.`, t: "No exceptions, including with a parent." },
  { b: "Bring photo ID.", t: "We ask anyone who looks under 25, at the counter. Drivers check photo ID on every delivery." },
  { b: "No buying for someone underage.", t: "We'll refuse the sale and log it." },
  { b: "Testing follows provincial rules:", t: "two people at a time, your own device or a disposable mouthpiece." },
  { b: "Nicotine is highly addictive.", t: "Everything we sell is 20 mg/mL or less and carries the Ontario excise stamp." },
];

export const DELIVERY_RULES = (minAge: number) => [
  `Verify your age before you order. A checkbox isn't enough; staff or an ID service checks real ID.`,
  `The person receiving the order must be ${minAge}+ and must be the verified customer named on the order.`,
  `The driver checks photo ID at the door against that name, every time.`,
  `No ID, or the wrong person: no handoff. The order comes back to the store.`,
  `Bags are labelled "Must be received by a person ${minAge} years of age or older".`,
  `Pay on delivery by cash or e-Transfer. No card payments online.`,
  `We never leave an order at the door or with someone else.`,
];

export const WHOLESALE_SERVICES = [
  { b: "Fair-price review", t: "We look at what you're paying and where the market sits right now." },
  { b: "Price match & price beat", t: "Bring a quote. If we can match or beat it, we'll say so." },
  { b: "Market overview", t: "A straight read on the competitive vape market across the region." },
];

export const NAV = [
  { href: "/delivery", label: "Pickup & delivery" },
  { href: "/rules", label: "Store rules" },
  { href: "/wholesale", label: "Wholesale" },
  { href: "/visit", label: "Visit" },
  { href: "/verify", label: "Shop" },
] as const;
