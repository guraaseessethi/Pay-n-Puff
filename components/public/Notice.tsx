import { DEFAULT_HOURS, formatMark, markToMinutes, type WeekHours } from "@/lib/hours/hours";
import styles from "./Chrome.module.css";

export function Notice({ minAge, hours = DEFAULT_HOURS }: { minAge: number; hours?: WeekHours }) {
  const late = [5, 6].filter((d) => hours[d] && markToMinutes(hours[d]!.close) > 24 * 60);
  return (
    <div className={styles.notice}>
      <div className={`wrap ${styles.noticeIn}`}>
        <span>
          <b>{minAge}+ ONLY</b> · Specialty vape store. Photo ID if you look under 25.
        </span>
        {late.length === 2 && <span>Open late Fri &amp; Sat, till {formatMark(hours[5]!.close)}</span>}
      </div>
    </div>
  );
}
