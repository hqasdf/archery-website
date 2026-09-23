"use client";
import { useState } from "react";
import { removeArrow as removeArrowAction, saveArrow } from "../actions";
import { SCORE_LABELS, arrowAverage, arrowKey, endTotal, points, roundTotal, scoreFromPlot, xCount, type ArrowEntry, type Plot, type RoundDraft, type ScoreLabel } from "../scoring-model";
import { TargetFace } from "./target-face";
import styles from "./sessions.module.css";

export function ScoringWorkspace({sessionTitle,sessionDate,round,onChange,onBack}:{sessionTitle:string;sessionDate:string;round:RoundDraft;onChange:(update:(round:RoundDraft)=>RoundDraft)=>void;onBack:()=>void}) {
  function findFirstOpen() { for (let end=1;end<=round.ends;end++) for (let arrow=1;arrow<=round.arrowsPerEnd;arrow++) if (!round.arrows.some((item)=>item.end===end&&item.arrow===arrow)) return {end,arrow}; return {end:round.ends,arrow:round.arrowsPerEnd}; }
  const [slot,setSlot]=useState(findFirstOpen);
  const [correctionOpen,setCorrectionOpen]=useState(false);
  const [saveMessage,setSaveMessage]=useState<string|null>(null);
  const selected=round.arrows.find((item)=>item.end===slot.end&&item.arrow===slot.arrow)??null;

  function chooseSlot(next:{end:number;arrow:number}) { setCorrectionOpen(false); setSlot(next); }
  function selectNext(arrows:ArrowEntry[]) {
    const total=round.ends*round.arrowsPerEnd,current=(slot.end-1)*round.arrowsPerEnd+(slot.arrow-1);
    for (let offset=1;offset<=total;offset++) { const index=(current+offset)%total,end=Math.floor(index/round.arrowsPerEnd)+1,arrow=index%round.arrowsPerEnd+1; if (!arrows.some((item)=>item.end===end&&item.arrow===arrow)) { chooseSlot({end,arrow}); return; } }
  }
  function replaceArrow(entry:ArrowEntry) { onChange((current)=>({...current,arrows:current.arrows.map((item)=>item.end===entry.end&&item.arrow===entry.arrow?entry:item)})); }
  async function persist(entry:ArrowEntry) {
    setSaveMessage(null);
    const result=await saveArrow({roundId:round.id,endNumber:entry.end,arrowNumber:entry.arrow,score:entry.score,plot:entry.plot});
    if (result.ok) replaceArrow(result.data);
    else { replaceArrow({...entry,syncState:"failed"}); setSaveMessage(result.message); }
  }
  function handleTarget(plot:Plot) {
    const score=scoreFromPlot(plot,round.faceType);
    if (selected) { const entry={...selected,score,plot,syncState:"saving" as const}; replaceArrow(entry); void persist(entry); return; }
    const entry:ArrowEntry={id:arrowKey(slot.end,slot.arrow),...slot,score,plot,syncState:"saving"};
    const arrows=[...round.arrows,entry]; onChange((current)=>({...current,arrows:[...current.arrows,entry]})); selectNext(arrows); void persist(entry);
  }
  function correctScore(score:ScoreLabel) { if (selected) { const entry={...selected,score,syncState:"saving" as const}; replaceArrow(entry); void persist(entry); } setCorrectionOpen(false); }
  function clearPlot() { if (selected) { const entry={...selected,plot:null,syncState:"saving" as const}; replaceArrow(entry); void persist(entry); } }
  async function removeSelected() {
    if (!selected) return; const removed=selected; setSaveMessage(null); onChange((current)=>({...current,arrows:current.arrows.filter((item)=>item.end!==removed.end||item.arrow!==removed.arrow)}));
    const result=await removeArrowAction({roundId:round.id,endNumber:removed.end,arrowNumber:removed.arrow});
    if (!result.ok) { onChange((current)=>({...current,arrows:[...current.arrows,{...removed,syncState:"failed"}]})); setSaveMessage(result.message); }
    setCorrectionOpen(false);
  }

  return <section className={styles.scoringView} aria-labelledby="scoring-title">
    <div className={styles.viewTop}><button type="button" className={styles.textButton} onClick={onBack}>← Session</button><p>{sessionTitle} · {sessionDate}</p></div>
    <div className={styles.scoreHeading}><div><p className={styles.kicker}>{round.division} · {round.distanceMetres} m · {faceLabel(round.faceType,round.faceDiameterCm)}</p><h2 id="scoring-title">{round.name}</h2></div><div className={styles.current}><span>Current</span><strong>End {slot.end} · Arrow {slot.arrow}</strong></div></div>
    {saveMessage&&<p className={styles.saveError} role="alert">{saveMessage} Select the Arrow and retry.</p>}
    <div className={styles.totals}><div><span>End {slot.end}</span><strong>{endTotal(round.arrows,slot.end)}</strong></div><div><span>Round</span><strong>{roundTotal(round.arrows)}</strong></div><div><span>Arrow avg.</span><strong>{formatArrowAverage(round.arrows)}</strong></div><div><span>X count</span><strong>{xCount(round.arrows)}</strong></div><div><span>Entered</span><strong>{round.arrows.length}/{round.ends*round.arrowsPerEnd}</strong></div></div>
    <div className={styles.scoringGrid}>
      <TargetFace arrows={round.arrows} selectedId={selected?.id??null} faceType={round.faceType} onPlot={handleTarget}/>
      <div className={styles.entryPanel}>
        <div className={styles.entryHeading}><div><p className={styles.kicker}>{selected?"Selected arrow":"Ready to score"}</p><h3>End {slot.end} · Arrow {slot.arrow}</h3></div><strong className={styles.selectedScore}>{selected?.score??"—"}</strong></div>
        <p className={styles.entryHint}>{selected?"Move its marker on the target, or correct only its recorded score.":"Tap the target to record the score and advance automatically."}</p>
        <div className={styles.arrowStrip} aria-label={`Arrows in end ${slot.end}`}>{Array.from({length:round.arrowsPerEnd},(_,index)=>{const arrow=round.arrows.find((item)=>item.end===slot.end&&item.arrow===index+1);return <button type="button" key={index} className={slot.arrow===index+1?styles.arrowChipActive:styles.arrowChip} onClick={()=>chooseSlot({end:slot.end,arrow:index+1})}><span>A{index+1}{arrow?.syncState==="saving"?" · saving":arrow?.syncState==="failed"?" · !":""}</span><strong>{arrow?.score??"–"}</strong></button>;})}</div>
        <div className={styles.endNav}><button type="button" disabled={slot.end===1} onClick={()=>chooseSlot({end:slot.end-1,arrow:1})}>Previous</button><span>End {slot.end} of {round.ends}</span><button type="button" disabled={slot.end===round.ends} onClick={()=>chooseSlot({end:slot.end+1,arrow:1})}>Next</button></div>
        {selected&&<div className={styles.editArea}><div className={styles.editActions}><button type="button" aria-expanded={correctionOpen} onClick={()=>setCorrectionOpen((open)=>!open)}>Correct score</button><button type="button" onClick={clearPlot} disabled={!selected.plot}>Clear marker</button><button type="button" className={styles.dangerText} onClick={removeSelected}>Remove arrow</button>{selected.syncState==="failed"&&<button type="button" className={styles.retryButton} onClick={()=>{const entry={...selected,syncState:"saving" as const};replaceArrow(entry);void persist(entry);}}>Retry save</button>}</div>{correctionOpen&&<div className={styles.correctionPanel} aria-label="Correct recorded score">{SCORE_LABELS.map((score)=><button key={score} type="button" aria-pressed={selected.score===score} className={`${styles.correctionOption} ${styles[`score${score==="M"?"Miss":score}`]}`} onClick={()=>correctScore(score)}>{score}</button>)}</div>}</div>}
      </div>
    </div>
    <div className={styles.roundLog}><h3>Arrows entered</h3>{round.arrows.length===0?<p>No arrows yet. Tap the target to score the first arrow.</p>:<div className={styles.logGrid}>{[...round.arrows].sort((a,b)=>a.end-b.end||a.arrow-b.arrow).map((item)=><button type="button" key={`${item.end}-${item.arrow}`} onClick={()=>chooseSlot({end:item.end,arrow:item.arrow})} className={selected?.end===item.end&&selected.arrow===item.arrow?styles.logItemActive:styles.logItem}><span>E{item.end} · A{item.arrow}</span><strong>{item.score}</strong><small>{item.syncState==="saving"?"Saving…":item.syncState==="failed"?"Not saved · Retry":"Saved"}{item.plot?" · plotted":""} · {points(item.score)} pts</small></button>)}</div>}</div>
  </section>;
}
function faceLabel(faceType:RoundDraft["faceType"],diameter:number) { return faceType==="triple_face"?`${diameter} cm triple face`:faceType==="six_ring"?`${diameter} cm 6-ring face`:`${diameter} cm full face`; }
function formatArrowAverage(arrows:ArrowEntry[]) { const average=arrowAverage(arrows); return average === null ? "—" : average.toFixed(1); }
