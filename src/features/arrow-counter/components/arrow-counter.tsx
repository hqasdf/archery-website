"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent, type WheelEvent } from "react";
import { addArrows, COUNTER_STORAGE_KEY, DEFAULT_COUNTER, readCounter, resetCounter, setIncrement, undoLastAddition, type ArrowCounterState } from "../counter-model";
import styles from "./arrow-counter.module.css";

export function ArrowCounter() {
  const [counter, setCounter] = useState<ArrowCounterState>(DEFAULT_COUNTER);
  const [ready, setReady] = useState(false);
  const [incrementInput, setIncrementInput] = useState(String(DEFAULT_COUNTER.increment));
  const [confirmReset, setConfirmReset] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      let stored = DEFAULT_COUNTER;
      try {
        const raw = window.localStorage.getItem(COUNTER_STORAGE_KEY);
        if (raw !== null) {
          const parsed: unknown = JSON.parse(raw);
          stored = readCounter(parsed);
          if (typeof parsed === "object" && parsed !== null && "version" in parsed && parsed.version !== 2) {
            window.localStorage.setItem(COUNTER_STORAGE_KEY, JSON.stringify(stored));
          }
        }
      } catch {
        setMessage("This browser could not load the saved counter.");
      }
      setCounter(stored);
      setIncrementInput(String(stored.increment));
      setReady(true);
    });
    return () => { active = false; };
  }, []);

  function apply(next: ArrowCounterState) {
    setCounter(next);
    setMessage(null);
    try {
      window.localStorage.setItem(COUNTER_STORAGE_KEY, JSON.stringify(next));
    } catch {
      setMessage("This browser could not save the counter. Keep this page open to retain the current tally.");
    }
  }

  function chooseIncrement(increment: number) {
    if (!Number.isSafeInteger(increment) || increment < 1) return;
    const next = setIncrement(counter, increment);
    setIncrementInput(String(next.increment));
    apply(next);
  }

  function editIncrement(value: string) {
    setIncrementInput(value);
    if (/^\d+$/.test(value)) chooseIncrement(Number(value));
  }

  function submitIncrement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d+$/.test(incrementInput) || !Number.isSafeInteger(Number(incrementInput)) || Number(incrementInput) < 1) {
      setMessage("Enter a positive whole-number increment.");
      setIncrementInput(String(counter.increment));
      return;
    }
    chooseIncrement(Number(incrementInput));
  }

  function adjustIncrement(amount: number) {
    chooseIncrement(Math.max(1, counter.increment + amount));
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    adjustIncrement(event.deltaY > 0 ? -1 : 1);
  }

  const nearbyValues = [...new Set([-2, -1, 1, 2].map((offset) => Math.max(1, counter.increment + offset)))];

  return <section className={styles.counter} aria-label="Arrow Counter">
    <h1 className={styles.srOnly}>Arrow Counter</h1>
    <div className={styles.toolbar}>
      <Link href="/sessions" className={styles.back} aria-label="Back to Sessions"><Icon name="back"/></Link>
      <div className={styles.tools}>
        <button type="button" aria-label="Undo last addition" title="Undo last addition" disabled={!ready || counter.history.length === 0} onClick={() => apply(undoLastAddition(counter))}><Icon name="undo"/></button>
        <button type="button" aria-label="Reset counter" title="Reset counter" disabled={!ready || (counter.totalArrows === 0 && counter.history.length === 0)} onClick={() => setConfirmReset(true)}><Icon name="reset"/></button>
      </div>
    </div>

    <div className={styles.centerRow}>
      <div className={styles.display} aria-live="polite" aria-atomic="true">
        <span className={styles.totalLabel}>TOTAL</span>
        <strong className={styles.total}>{counter.totalArrows}</strong>
      </div>
      <div className={styles.selector} onWheel={handleWheel} aria-label="Addition amount selector">
        {nearbyValues.filter((value) => value < counter.increment).sort((a,b)=>b-a).map((value) => <button key={`before-${value}`} type="button" className={styles.nearby} onClick={() => chooseIncrement(value)}>+{value}</button>)}
        <form className={styles.selectedIncrement} onSubmit={submitIncrement}>
          <button type="button" aria-label="Decrease addition amount" onClick={() => adjustIncrement(-1)}>−</button>
          <label className={styles.srOnly} htmlFor="arrow-increment">Selected addition amount</label>
          <input id="arrow-increment" type="text" inputMode="numeric" pattern="[0-9]*" value={incrementInput} disabled={!ready} onChange={(event) => editIncrement(event.target.value)} onBlur={() => setIncrementInput(String(counter.increment))}/>
          <button type="button" aria-label="Increase addition amount" onClick={() => adjustIncrement(1)}>+</button>
        </form>
        {nearbyValues.filter((value) => value > counter.increment).sort((a,b)=>a-b).map((value) => <button key={`after-${value}`} type="button" className={styles.nearby} onClick={() => chooseIncrement(value)}>+{value}</button>)}
      </div>
    </div>

    <button className={styles.clicker} type="button" aria-label={`Add ${counter.increment} arrows`} disabled={!ready || counter.totalArrows > Number.MAX_SAFE_INTEGER - counter.increment} onClick={() => apply(addArrows(counter))}>
      <Icon name="up"/><span>+{counter.increment}</span>
    </button>
    {message && <p className={styles.message} role="alert">{message}</p>}

    {confirmReset && <div className={styles.modalBackdrop}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="counter-confirm-title" onKeyDown={(event) => { if (event.key === "Escape") setConfirmReset(false); }}>
        <h2 id="counter-confirm-title">Reset the count?</h2>
        <p>The total and Undo history will be cleared.</p>
        <div className={styles.confirmActions}>
          <button type="button" onClick={() => setConfirmReset(false)}>Cancel</button>
          <button type="button" className={styles.apply} onClick={() => { apply(resetCounter(counter)); setConfirmReset(false); }}>Reset</button>
        </div>
      </div>
    </div>}
  </section>;
}

function Icon({name}: {name: "back" | "undo" | "reset" | "up"}) {
  const paths = {
    back: <><path d="m14 5-7 7 7 7"/><path d="M7 12h13"/></>,
    undo: <><path d="M9 7 4 12l5 5"/><path d="M4 12h10a6 6 0 0 1 0 12"/></>,
    reset: <><path d="M4 11a8 8 0 1 1 2 6"/><path d="M4 4v7h7"/></>,
    up: <><path d="m5 14 7-7 7 7"/><path d="M12 7v12"/></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
