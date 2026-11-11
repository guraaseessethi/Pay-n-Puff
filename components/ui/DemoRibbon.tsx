import styles from "./DemoRibbon.module.css";

export function DemoRibbon({ extra }: { extra?: string }) {
  return (
    <div className={styles.ribbon} role="note">
      Concept preview · sample data{extra ? ` · ${extra}` : ""}
    </div>
  );
}
