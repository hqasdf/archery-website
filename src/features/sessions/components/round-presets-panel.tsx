import { ROUND_PRESETS, type RoundPreset } from "../round-presets";
import styles from "./sessions.module.css";
export function RoundPresetsPanel({ selectedId, onSelect }: { selectedId: string | null; onSelect: (preset: RoundPreset) => void }) {
  return <fieldset className={styles.presetPanel}>
    <legend>Start with a preset</legend>
    <p className={styles.fieldHint}>Choose one to prefill the form. Every value stays editable.</p>
    <div className={styles.presetGrid}>
      {ROUND_PRESETS.map((round) => <button key={round.id} type="button" className={selectedId === round.id ? styles.presetSelected : styles.preset} aria-pressed={selectedId === round.id} onClick={() => onSelect(round)}>
        <strong>{round.distanceMetres} m</strong><span>{round.defaultEnds} ends × {round.defaultArrowsPerEnd}</span>
      </button>)}
      <button type="button" className={selectedId === null ? styles.presetSelected : styles.preset} aria-pressed={selectedId === null} onClick={() => onSelect({ id: "custom", name: "Custom round", distanceMetres: 30, defaultEnds: 6, defaultArrowsPerEnd: 6, faceDiameterCm: 80, faceType: "full_face" })}>
        <strong>Custom</strong><span>Set your own format</span>
      </button>
    </div>
  </fieldset>;
}
