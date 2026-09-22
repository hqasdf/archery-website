"use client";
import { useState } from "react";
import { DIVISIONS, ROUND_PRESETS, TARGET_FACE_OPTIONS, type Division, type RoundPreset } from "../round-presets";
import type { RoundDraft, SessionDraft, TargetFaceType } from "../scoring-model";
import { RoundPresetsPanel } from "./round-presets-panel";
import { ScoringWorkspace } from "./scoring-workspace";
import styles from "./sessions.module.css";

type View = "sessions"|"session"|"setup"|"scoring";
type RoundForm = Omit<RoundDraft, "id"|"arrows">;
const today = new Date().toISOString().slice(0,10);
const base = ROUND_PRESETS[3];

export function SessionsWorkspace() {
  const [view,setView]=useState<View>("sessions");
  const [session,setSession]=useState<SessionDraft|null>(null);
  const [activeRoundId,setActiveRoundId]=useState<string|null>(null);
  const [sessionForm,setSessionForm]=useState({title:"",date:today});
  const [selectedPreset,setSelectedPreset]=useState<string|null>(base.id);
  const [roundForm,setRoundForm]=useState<RoundForm>({name:base.name,division:"Recurve",distanceMetres:base.distanceMetres,ends:base.defaultEnds,arrowsPerEnd:base.defaultArrowsPerEnd,faceDiameterCm:base.faceDiameterCm,faceType:base.faceType});
  const activeRound=session?.rounds.find((round)=>round.id===activeRoundId)??null;
  function choosePreset(preset:RoundPreset) {
    const target=defaultTarget(preset.distanceMetres,roundForm.division,{faceDiameterCm:preset.faceDiameterCm,faceType:preset.faceType});
    setSelectedPreset(preset.id==="custom"?null:preset.id);
    setRoundForm((current)=>({...current,name:preset.name,distanceMetres:preset.distanceMetres,ends:preset.defaultEnds,arrowsPerEnd:preset.defaultArrowsPerEnd,...target}));
  }
  function changeDistance(distanceMetres:number) {
    setRoundForm((current)=>({...current,distanceMetres,...defaultTarget(distanceMetres,current.division,{faceDiameterCm:current.faceDiameterCm,faceType:current.faceType})}));
  }
  function changeDivision(division:Division) {
    setRoundForm((current)=>current.distanceMetres===50&&division==="Compound"
      ? {...current,division,faceDiameterCm:80,faceType:"six_ring"}
      : {...current,division});
  }
  function chooseTargetOption(id:string) {
    const option=TARGET_FACE_OPTIONS.find((item)=>item.id===id);
    if (option) setRoundForm((current)=>({...current,faceDiameterCm:option.diameterCm,faceType:option.faceType}));
  }
  function createSession(event:React.FormEvent) {
    event.preventDefault();
    setSession({id:"prototype-session",title:sessionForm.title.trim()||"Practice session",date:sessionForm.date,rounds:[]});
    setView("session");
  }
  function createRound(event:React.FormEvent) {
    event.preventDefault();
    if (!session) return;
    const round:RoundDraft={id:`round-${Date.now()}`,...roundForm,arrows:[]};
    setSession({...session,rounds:[...session.rounds,round]});
    setActiveRoundId(round.id);
    setView("scoring");
  }
  function updateRound(next:RoundDraft) {
    if (session) setSession({...session,rounds:session.rounds.map((round)=>round.id===next.id?next:round)});
  }
  if (view==="scoring"&&session&&activeRound) return <><PrototypeNotice/><ScoringWorkspace sessionTitle={session.title} sessionDate={session.date} round={activeRound} onChange={updateRound} onBack={()=>setView("session")}/></>;
  return <section className={styles.workspace}>
    <PrototypeNotice/>
    {view==="sessions"&&<div className={styles.startCard}>
      <div><p className={styles.kicker}>Local scoring prototype</p><h2>Start today’s scorecard</h2><p>Create a temporary Session, then add as many Rounds as you need.</p></div>
      {session?<button className={styles.primary} type="button" onClick={()=>setView("session")}>Open temporary Session</button>:<button className={styles.primary} type="button" onClick={()=>setView("session")}>New Session</button>}
    </div>}
    {view==="session"&&!session&&<form className={styles.formCard} onSubmit={createSession}>
      <div className={styles.viewTop}><button type="button" className={styles.textButton} onClick={()=>setView("sessions")}>← Sessions</button><p>New Session</p></div>
      <h2>Create a Session</h2><p className={styles.formIntro}>Only the date is required. Give the visit a title if that helps.</p>
      <div className={styles.formGrid}>
        <label><span>Session date</span><input required type="date" value={sessionForm.date} onChange={(e)=>setSessionForm({...sessionForm,date:e.target.value})}/></label>
        <label><span>Title <small>optional</small></span><input type="text" maxLength={80} placeholder="Evening practice" value={sessionForm.title} onChange={(e)=>setSessionForm({...sessionForm,title:e.target.value})}/></label>
      </div>
      <button className={styles.primary} type="submit">Create Session</button>
    </form>}
    {view==="session"&&session&&<div>
      <div className={styles.viewTop}><button type="button" className={styles.textButton} onClick={()=>setView("sessions")}>← Sessions</button><p>{session.date}</p></div>
      <div className={styles.sessionHeading}><div><p className={styles.kicker}>Temporary Session</p><h2>{session.title}</h2></div><button className={styles.primary} type="button" onClick={()=>setView("setup")}>Add Round</button></div>
      {session.rounds.length===0?<div className={styles.emptyRounds}><h3>No rounds yet</h3><p>Add a preset or create a custom Round to begin scoring.</p></div>:<div className={styles.roundCards}>
        {session.rounds.map((round)=><article key={round.id} className={styles.roundCard}><div><p className={styles.kicker}>{round.division}</p><h3>{round.name}</h3><p>{round.distanceMetres} m · {round.ends} ends × {round.arrowsPerEnd} arrows</p></div><div><strong>{round.arrows.length}</strong><span> entered</span><button type="button" onClick={()=>{setActiveRoundId(round.id);setView("scoring");}}>Open</button></div></article>)}
      </div>}
    </div>}
    {view==="setup"&&session&&<form className={styles.formCard} onSubmit={createRound}>
      <div className={styles.viewTop}><button type="button" className={styles.textButton} onClick={()=>setView("session")}>← Session</button><p>Round {session.rounds.length+1}</p></div>
      <h2>Configure Round</h2><p className={styles.formIntro}>Presets are starting points. Adjust anything to match what you are shooting.</p>
      <RoundPresetsPanel selectedId={selectedPreset} onSelect={choosePreset}/>
      <div className={styles.formGrid}>
        <label className={styles.fullField}><span>Round name</span><input required value={roundForm.name} onChange={(e)=>setRoundForm({...roundForm,name:e.target.value})}/></label>
        <label><span>Division</span><select value={roundForm.division} onChange={(e)=>changeDivision(e.target.value as Division)}>{DIVISIONS.map((item)=><option key={item}>{item}</option>)}</select></label>
        <NumberField label="Distance (m)" value={roundForm.distanceMetres} onChange={changeDistance}/>
        <NumberField label="Number of Ends" value={roundForm.ends} onChange={(value)=>setRoundForm({...roundForm,ends:value})}/>
        <NumberField label="Arrows per End" value={roundForm.arrowsPerEnd} onChange={(value)=>setRoundForm({...roundForm,arrowsPerEnd:value})}/>
        <label className={styles.fullField}><span>Target face option</span><select value={TARGET_FACE_OPTIONS.find((item)=>item.diameterCm===roundForm.faceDiameterCm&&item.faceType===roundForm.faceType)?.id??"custom"} onChange={(e)=>chooseTargetOption(e.target.value)}>
          <option value="custom" disabled>Custom target settings</option>{TARGET_FACE_OPTIONS.map((item)=><option key={item.id} value={item.id}>{item.label}</option>)}
        </select></label>
        <NumberField label="Target face diameter (cm)" value={roundForm.faceDiameterCm} onChange={(value)=>setRoundForm({...roundForm,faceDiameterCm:value})}/>
        <label><span>Target face layout</span><select value={roundForm.faceType} onChange={(e)=>setRoundForm({...roundForm,faceType:e.target.value as TargetFaceType})}>
          <option value="full_face">Full face</option><option value="six_ring">6-ring face</option><option value="triple_face">Triple face</option>
        </select></label>
      </div>
      <button className={styles.primary} type="submit">Start scoring</button>
    </form>}
  </section>;
}
function NumberField({label,value,onChange}:{label:string;value:number;onChange:(value:number)=>void}) {
  return <label><span>{label}</span><input required type="number" min="1" step="1" value={value} onChange={(e)=>onChange(Math.max(1,Number(e.target.value)))}/></label>;
}
function defaultTarget(distanceMetres:number,division:Division,fallback:{faceDiameterCm:number;faceType:TargetFaceType}) {
  if (distanceMetres===70) return {faceDiameterCm:122,faceType:"full_face" as const};
  if (distanceMetres===50&&division==="Compound") return {faceDiameterCm:80,faceType:"six_ring" as const};
  if (distanceMetres===18) return {faceDiameterCm:40,faceType:"full_face" as const};
  return fallback;
}
function PrototypeNotice() { return <p className={styles.prototypeNotice}>Prototype · This Session lives only on this page. Refreshing or leaving /sessions resets it.</p>; }
