"use client";

import { useEffect, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { DAY_NAMES, DAY_SHORT, describeOpenState, formatDay, markToMinutes, openState, STORE_TZ, torontoParts, type WeekHours } from "@/lib/hours/hours";
import styles from "./DepartureBoard.module.css";

/**
 * Live open/closed "departures board". Times are always Toronto time.
 * The visual board is hidden from screen readers; a plain-text equivalent sits beside it.
 */
export function DepartureBoard({ hours, nowIso }: { hours: WeekHours; nowIso: string }) {
  const [now, setNow] = useState(() => new Date(nowIso));
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync to the browser clock once mounted
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const state = openState(hours, now);
  const { day } = torontoParts(now);
  // While we're inside last night's past-midnight window, "today" on the board is still that day.
  const boardDay = state.open ? state.day : day;
  const order = Array.from({ length: 7 }, (_, i) => (boardDay + i) % 7);
  const status = describeOpenState(state);
  const plain = `${status} Hours: ${[1, 2, 3, 4, 5, 6, 0].map((d) => `${DAY_NAMES[d]} ${formatDay(hours[d]).replace("–", "to")}`).join("; ")}.`;

  return (
    <div className={styles.board}>
      <div className={styles.bh} aria-hidden="true">
        <b>Departures · Gate 15</b>
        <span className={styles.clock}>{formatInTimeZone(now, STORE_TZ, "h:mm a")}</span>
      </div>
      <div aria-hidden="true">
        {order.map((d, i) => {
          const h = hours[d];
          const late = h && markToMinutes(h.close) > 24 * 60;
          const label = !h ? "No flights" : i === 0 && state.open ? "Boarding" : late ? "Late" : "On time";
          const cls = !h ? styles.off : i === 0 && state.open ? styles.on : late ? styles.late : "";
          return (
            <div key={d} className={`${styles.row} ${i === 0 ? styles.today : ""}`}>
              <span className={styles.d}>{i === 0 ? "Today" : DAY_SHORT[d]}</span>
              <span className={styles.t}>{h ? formatDay(h) : `Closed${d === 1 ? " *" : ""}`}</span>
              <span key={`${d}-${label}`} className={`${styles.s} ${cls}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
      <div className={styles.bf}>
        <i className={state.open ? styles.dotOn : styles.dot} aria-hidden="true" />
        <span aria-live="polite">{status}</span>
      </div>
      <p className="sr-only">{plain}</p>
    </div>
  );
}
