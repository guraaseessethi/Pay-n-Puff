"use client";

import { useState, useTransition } from "react";
import { judgeIdCheck } from "@/app/actions/staff";
import { useAdmin } from "../AdminContext";
import { DoorCheckForm } from "../DoorCheckForm";
import { VerifyCustomer } from "../IdForms";
import { Kpi, Loading, PageHeader } from "../ui";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { sellable } from "@/lib/compliance/sellable";
import { checkZone } from "@/lib/delivery/zones";
import { isLive, STATUS_TONE } from "@/lib/delivery/status";
import type { Order } from "@/lib/domain/types";
import { formatCents, splitTaxIn } from "@/lib/money";

const DRIVERS = ["Driver 1", "Driver 2"];

export function Flights() {
  const { state, repo, staff, settings } = useAdmin();
  const [door, setDoor] = useState<Order | null>(null);
  const [verifyFor, setVerifyFor] = useState<Order | null>(null);
  const [phone, setPhone] = useState(false);
  const [, start] = useTransition();
  if (!state) return <Loading />;

  const act = (fn: () => Promise<Order>, msg: (o: Order) => string) =>
    start(async () => {
      try {
        toast(msg(await fn()));
      } catch (e) {
        toast((e as Error).message);
      }
    });

  const landed = state.orders.filter((o) => o.status === "Landed").length;
  const returned = state.orders.filter((o) => o.status === "Returned").length;

  return (
    <>
      <PageHeader
        title="Deliveries"
        sub="Every flight lands only after a photo-ID check at the door. No ID, no handoff."
        actions={
          settings.deliveryEnabled ? (
            <button className="btn sm line" type="button" onClick={() => setPhone(true)}>
              New phone order
            </button>
          ) : (
            <span className="pill p-bad">Delivery switched off in Settings</span>
          )
        }
      />
      <div className="g g4">
        <Kpi k="Live" v={state.orders.filter((o) => isLive(o.status)).length} d="booked to at the door" />
        <Kpi k="Landed" v={landed} d="ID checked at door" tone="up" />
        <Kpi k="Returned" v={returned} d="no ID, under age or wrong person" tone={returned ? "bad" : ""} />
        <Kpi k="Avg. flight" v="24 min" d={<span className="sample">sample</span>} />
      </div>

      <div className="fb mt" role="region" aria-label="Departures board" tabIndex={0}>
        <div className="fbr hd" aria-hidden="true">
          <span>Flight</span>
          <span>Customer</span>
          <span>Order</span>
          <span>ETA</span>
          <span>Status</span>
          <span />
        </div>
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {state.orders.map((o) => (
            <li className="fbr" key={o.code}>
              <span className="code">{o.code}</span>
              <span>
                {o.recipientShort}
                {o.firstOrderUnverified && <small>First order · verify at door</small>}
                <small>{o.address}</small>
              </span>
              <span style={{ fontSize: 13 }}>
                {o.lines.map((l) => `${l.qty} × ${l.label}`).join(", ")}
                <small>
                  {formatCents(o.totalCents)} tax in · {o.paymentMethod === "etransfer" ? "e-Transfer" : "Cash"}
                </small>
              </span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 13 }}>
                {o.eta ?? "—"}
                <small>{o.driver ?? "—"}</small>
              </span>
              <span>
                <span key={o.status} className={`pill p-${STATUS_TONE[o.status]} flip`}>
                  {o.status}
                </span>
              </span>
              <span style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                {o.status === "Booked" && (
                  <>
                    <label className="sr-only" htmlFor={`drv-${o.code}`}>
                      Assign a driver to {o.code}
                    </label>
                    <select
                      id={`drv-${o.code}`}
                      className="inp"
                      style={{ width: "auto" }}
                      defaultValue=""
                      onChange={(e) => e.target.value && act(() => repo.assignDriver(o.code, e.target.value), (x) => `${x.code} boarding with ${x.driver}`)}
                    >
                      <option value="">Driver…</option>
                      {DRIVERS.map((d) => (
                        <option key={d}>{d}</option>
                      ))}
                    </select>
                  </>
                )}
                {o.status === "Boarding" && (
                  <button className="btn sm" type="button" onClick={() => act(() => repo.takeOff(o.code), (x) => `${x.code} is in flight`)}>
                    Take off
                  </button>
                )}
                {o.status === "In flight" && (
                  <button className="btn sm hot" type="button" onClick={() => act(() => repo.arriveAtDoor(o.code), (x) => `${x.code} at the door`)}>
                    At the door
                  </button>
                )}
                {o.status === "At the door" && (
                  <button className="btn sm hot" type="button" onClick={() => setDoor(o)}>
                    Door ID check
                  </button>
                )}
                {(o.status === "Booked" || o.status === "Boarding") && (
                  <button className="btn sm line" type="button" onClick={() => act(() => repo.returnOrder(o.code, "Cancelled before take-off", staff.name), (x) => `${x.code} cancelled, stock restocked`)}>
                    Cancel
                  </button>
                )}
                {(o.status === "Landed" || o.status === "Returned") && (
                  <span style={{ fontSize: 12.5, color: "#d8d2e6" }}>
                    {o.outcome}
                    {o.status === "Returned" && o.restocked ? " · restocked" : ""}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="g g3 mt">
        <section className="pn">
          <h2>Door rules for drivers</h2>
          <div className="ls" style={{ marginTop: 6 }}>
            <div className="it">Hand over only to the verified adult named on the order</div>
            <div className="it">Photo ID every time. The name must match</div>
            <div className="it">No ID, under {settings.minAge} or wrong person: bring it back and log it</div>
            <div className="it">Never leave it at the door or with someone else</div>
          </div>
        </section>
        <section className="pn">
          <h2>Delivery area</h2>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--gray)" }}>
            Postal codes starting {settings.delivery.fsas.join(", ")}. Fee {formatCents(settings.delivery.feeCents)}, minimum {formatCents(settings.delivery.minimumCents)}. Change it in
            Settings.
          </p>
          <p style={{ margin: "10px 0 0" }}>
            <span className="sample">Sample zone. Confirm with the owner</span>
          </p>
        </section>
        <section className="pn">
          <h2>Packaging</h2>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--gray)" }}>
            Each bag gets a label: &quot;Must be received by a person {settings.minAge} years of age or older.&quot;
          </p>
        </section>
      </div>

      {door && (
        <Modal title={`${door.code} · at the door`} onClose={() => setDoor(null)}>
          <DoorCheckForm
            order={door}
            minAge={settings.minAge}
            staffName={door.driver ?? staff.name}
            onSubmit={async (input) => {
              const j = await judgeIdCheck(input);
              if (!j.ok) throw new Error(j.error);
              const { order, check } = await repo.recordDoorCheck(door.code, input, settings.minAge);
              toast(order.status === "Landed" ? `${order.code} landed. ${order.outcome}.` : `${order.code} coming back to the store. ${check.reason}. Logged.`);
              return { result: check.result, reason: check.reason };
            }}
            after={(o) => {
              const d = door;
              setDoor(null);
              if ("result" in o && o.result === "Pass" && d.firstOrderUnverified && settings.ageGateMode === "staff_verified") setVerifyFor(d);
            }}
          />
        </Modal>
      )}

      {verifyFor && (
        <Modal title="First delivery: verify for online ordering?" onClose={() => setVerifyFor(null)}>
          <p>ID was checked at the door. Verify this customer so they can order online next time.</p>
          <VerifyCustomer repo={repo} where="door" minAge={settings.minAge} defaultName={verifyFor.recipientName} defaultContact={verifyFor.contact ?? ""} />
          <div className="bnav">
            <button className="btn line" type="button" onClick={() => setVerifyFor(null)}>
              Close
            </button>
          </div>
        </Modal>
      )}

      {phone && <PhoneOrder onClose={() => setPhone(false)} />}
    </>
  );
}

/** staff_verified mode: a customer's first order comes in by phone; their ID is checked by the driver at the door. */
function PhoneOrder({ onClose }: { onClose: () => void }) {
  const { state, repo, settings } = useAdmin();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [addr, setAddr] = useState("");
  const [postal, setPostal] = useState("");
  const [sku, setSku] = useState("");
  const [qty, setQty] = useState(1);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const products = (state?.products ?? []).filter((p) => sellable(p) && p.stock > 0);
  const p = products.find((x) => x.sku === sku) ?? products[0];
  const subtotal = p ? p.priceCents * qty : 0;

  return (
    <Modal title="New phone order" onClose={onClose}>
      <p>First order from a customer who isn&apos;t verified online yet. The driver checks photo ID at the door, then can verify them for online ordering.</p>
      <div className="fg">
        <div className="fld">
          <label htmlFor="po-n">Customer full name</label>
          <input id="po-n" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="fld">
          <label htmlFor="po-c">Email or mobile</label>
          <input id="po-c" value={contact} onChange={(e) => setContact(e.target.value)} />
        </div>
        <div className="fld">
          <label htmlFor="po-a">Street address</label>
          <input id="po-a" value={addr} onChange={(e) => setAddr(e.target.value)} />
        </div>
        <div className="fld">
          <label htmlFor="po-p">Postal code</label>
          <input id="po-p" value={postal} onChange={(e) => setPostal(e.target.value)} />
        </div>
        <div className="fld">
          <label htmlFor="po-s">Product</label>
          <select id="po-s" value={p?.sku ?? ""} onChange={(e) => setSku(e.target.value)}>
            {products.map((x) => (
              <option key={x.sku} value={x.sku}>
                {x.brand} {x.name} · {formatCents(x.priceCents)}
              </option>
            ))}
          </select>
        </div>
        <div className="fld">
          <label htmlFor="po-q">Quantity</label>
          <input id="po-q" type="number" min={1} max={10} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(10, Number(e.target.value) || 1)))} />
        </div>
      </div>
      {err && (
        <p role="alert" style={{ color: "var(--bad)", fontWeight: 600 }}>
          {err}
        </p>
      )}
      <div className="bnav">
        <button className="btn line" type="button" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn hot"
          type="button"
          disabled={pending || !p}
          onClick={() =>
            start(async () => {
              if (name.trim().split(/\s+/).length < 2) return setErr("Enter first and last name (it must match their ID).");
              if (contact.trim().length < 5) return setErr("Add an email or mobile number.");
              if (addr.trim().length < 5) return setErr("Add the street address.");
              const z = checkZone(postal, subtotal, settings.delivery);
              if (!z.ok) return setErr(z.message);
              const split = splitTaxIn(subtotal + z.feeCents);
              const parts = name.trim().split(/\s+/);
              try {
                const o = await repo.createDeliveryOrder({
                  kind: "delivery",
                  recipientName: name.trim(),
                  recipientShort: `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`,
                  address: addr.trim(),
                  postalCode: z.postal,
                  zoneFsa: z.fsa,
                  window: settings.delivery.windows[0],
                  paymentMethod: "cash",
                  lines: [{ sku: p!.sku, label: `${p!.brand} ${p!.name}`, qty, unitCents: p!.priceCents }],
                  subtotalCents: subtotal,
                  deliveryFeeCents: z.feeCents,
                  totalCents: split.totalCents,
                  preTaxCents: split.preTaxCents,
                  taxCents: split.taxCents,
                  firstOrderUnverified: true,
                  contact: contact.trim(),
                });
                toast(`${o.code} booked. ID check at the door.`);
                onClose();
              } catch (e) {
                setErr((e as Error).message);
              }
            })
          }
        >
          Book delivery
        </button>
      </div>
    </Modal>
  );
}
