import { MAX_ARROW_SCORE, ROUND_PRESETS } from "../round-presets";
import styles from "@/styles/pages.module.css";

export function RoundPresetsPanel() {
  return (
    <section className={styles.panel} aria-labelledby="rounds-heading">
      <div className={styles.panelHeader}>
        <p className={styles.eyebrow}>Recurve & compound</p>
        <h2 id="rounds-heading">Your starting rounds</h2>
        <p>Default arrangements, with room to adapt.</p>
      </div>
      <ul className={styles.roundList}>
        {ROUND_PRESETS.map((round) => (
          <li key={round.id} className={styles.round}>
            <p className={styles.distance}>
              {round.distanceMetres} <span>m</span>
            </p>
            <p className={styles.arrangement}>
              {round.defaultEnds} ends × {round.defaultArrowsPerEnd} arrows
              <span>
                {round.requiredArrows} arrows ·{" "}
                {round.requiredArrows * MAX_ARROW_SCORE} points maximum
              </span>
            </p>
          </li>
        ))}
      </ul>
      <details className={styles.details}>
        <summary>A different end arrangement?</summary>
        <p>
          You will be able to adjust the arrangement when logging. At 70 m, 3
          ends of 12 arrows still make a complete 36-arrow round. Custom rounds
          will let you specify a different distance and round length.
        </p>
      </details>
    </section>
  );
}
