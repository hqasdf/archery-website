"use client";

import { useRef, useState, type PointerEvent } from "react";
import type { ArrowEntry, Plot, TargetFaceType } from "../scoring-model";
import { calculatePinchTransform, clientToSvg, distanceBetween, IDENTITY_TARGET_TRANSFORM, inverseTargetTransform, midpoint, plotFromSvg, shouldCommitTargetTap, type TargetPoint, type TargetTransform } from "../target-gesture";
import styles from "./sessions.module.css";

const ringColours: Record<number,string> = {1:"#f4f1e9",.9:"#f4f1e9",.8:"#202020",.7:"#202020",.6:"#49a4cf",.5:"#49a4cf",.4:"#e65a55",.3:"#e65a55",.2:"#f5cf3d",.1:"#f5cf3d"};
const fullRings=[1,.9,.8,.7,.6,.5,.4,.3,.2,.1];
const sixRings=[.6,.5,.4,.3,.2,.1];
const tripleRings=[.5,.4,.3,.2,.1];
const tripleCentres=[-110,0,110] as const;
const views={full_face:{x:-105,y:-105,width:210,height:210},six_ring:{x:-65,y:-65,width:130,height:130},triple_face:{x:-58,y:-168,width:116,height:336}} as const;

export function TargetFace({ arrows, selectedId, faceType, onPlot }: { arrows: ArrowEntry[]; selectedId: string|null; faceType: TargetFaceType; onPlot: (plot: Plot) => void }) {
  const view=views[faceType];
  const [transform,setTransform]=useState<TargetTransform>(IDENTITY_TARGET_TRANSFORM);
  const transformRef=useRef(transform);
  const pointers=useRef(new Map<number,TargetPoint>());
  const tap=useRef<{id:number;start:TargetPoint;moved:boolean}|null>(null);
  const pinch=useRef<{transform:TargetTransform;midpoint:TargetPoint;distance:number}|null>(null);
  const hadMultiTouch=useRef(false);
  const suppressUntil=useRef(0);

  function updateTransform(next:TargetTransform) { transformRef.current=next; setTransform(next); }
  function eventSvgPoint(event:PointerEvent<SVGSVGElement>) { return clientToSvg({x:event.clientX,y:event.clientY},event.currentTarget.getBoundingClientRect(),view); }
  function beginPinch(event:PointerEvent<SVGSVGElement>) {
    const pair=[...pointers.current.values()].slice(0,2);
    hadMultiTouch.current=true; tap.current=null;
    pinch.current={transform:transformRef.current,midpoint:clientPointToSvg(midpoint(pair[0],pair[1]),event.currentTarget),distance:distanceBetween(pair[0],pair[1])};
  }
  function handlePointerDown(event:PointerEvent<SVGSVGElement>) {
    event.preventDefault();
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch {}
    const point={x:event.clientX,y:event.clientY};
    pointers.current.set(event.pointerId,point);
    if (pointers.current.size===1 && performance.now()>=suppressUntil.current) {
      hadMultiTouch.current=false; tap.current={id:event.pointerId,start:point,moved:false}; pinch.current=null;
    } else if (pointers.current.size>=2) beginPinch(event);
  }
  function handlePointerMove(event:PointerEvent<SVGSVGElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    const point={x:event.clientX,y:event.clientY}; pointers.current.set(event.pointerId,point);
    if (pointers.current.size>=2) {
      if (!pinch.current) beginPinch(event);
      const pair=[...pointers.current.values()].slice(0,2);
      const current=pinch.current!;
      updateTransform(calculatePinchTransform(current.transform,current.midpoint,current.distance,clientPointToSvg(midpoint(pair[0],pair[1]),event.currentTarget),distanceBetween(pair[0],pair[1])));
    } else if (tap.current?.id===event.pointerId && distanceBetween(tap.current.start,point)>8) tap.current.moved=true;
  }
  function handlePointerUp(event:PointerEvent<SVGSVGElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    const candidate=tap.current;
    const commit=candidate?.id===event.pointerId && shouldCommitTargetTap({moved:candidate.moved,hadMultiTouch:hadMultiTouch.current,suppressed:performance.now()<suppressUntil.current,pointerCount:pointers.current.size});
    if (commit) onPlot(plotFromSvg(inverseTargetTransform(eventSvgPoint(event),transformRef.current),faceType,tripleCentres));
    pointers.current.delete(event.pointerId);
    if (hadMultiTouch.current) suppressUntil.current=performance.now()+350;
    if (pointers.current.size<2) pinch.current=null;
    if (pointers.current.size===0) { tap.current=null; hadMultiTouch.current=false; }
  }
  function handlePointerCancel(event:PointerEvent<SVGSVGElement>) {
    pointers.current.delete(event.pointerId); tap.current=null; pinch.current=null; suppressUntil.current=performance.now()+350;
    if (pointers.current.size===0) hadMultiTouch.current=false;
  }
  function resetZoom() { pointers.current.clear(); tap.current=null; pinch.current=null; hadMultiTouch.current=false; updateTransform(IDENTITY_TARGET_TRANSFORM); }

  const viewBox=`${view.x} ${view.y} ${view.width} ${view.height}`;
  const label=faceType==="triple_face"?"Three-face target":faceType==="six_ring"?"Six-ring target":"Full ten-ring target";
  return <div className={`${styles.targetWrap} ${faceType==="triple_face"?styles.tripleTargetWrap:""}`}>
    <div className={styles.targetToolbar}><span>{transform.scale>1?`${transform.scale.toFixed(1)}x zoom`:"Target view"}</span><button type="button" onClick={resetZoom} disabled={transform.scale===1&&transform.panX===0&&transform.panY===0}>Reset zoom</button></div>
    <svg className={`${styles.target} ${faceType==="triple_face"?styles.tripleTarget:""}`} viewBox={viewBox} role="img" aria-label={`${label}. Tap to score the current arrow or move the selected arrow. Pinch with two fingers to zoom and pan.`} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerCancel}>
      <g transform={`translate(${transform.panX} ${transform.panY}) scale(${transform.scale})`}>
        {faceType==="triple_face"
          ? tripleCentres.map((cy,index)=><Face key={index} cy={cy} radii={tripleRings}/>)
          : <Face cy={0} radii={faceType==="six_ring"?sixRings:fullRings}/>
        }
        {arrows.filter((item)=>item.plot).map((item)=>{ const cy=faceType==="triple_face"?tripleCentres[item.plot!.faceIndex??1]:0; return <g key={item.id} transform={`translate(${item.plot!.x*100} ${cy+item.plot!.y*100})`}><circle r={item.id===selectedId?5.5:4} className={item.id===selectedId?styles.markerSelected:styles.marker}/><text y="1.8" textAnchor="middle" className={styles.markerText}>{item.arrow}</text></g>; })}
      </g>
    </svg>
    <p className={styles.targetHint}>{selectedId?"Tap to move this Arrow. Pinch with two fingers to zoom or pan.":"Tap to score. Pinch with two fingers to zoom or pan."}</p>
  </div>;
}

function clientPointToSvg(point:TargetPoint,svg:SVGSVGElement) { const box=svg.viewBox.baseVal; return clientToSvg(point,svg.getBoundingClientRect(),{x:box.x,y:box.y,width:box.width,height:box.height}); }
function Face({cy,radii}:{cy:number;radii:number[]}) { return <g>{radii.map((radius)=><circle key={radius} cx="0" cy={cy} r={radius*100} fill={ringColours[radius]} stroke="#4b443e" strokeWidth=".7"/>)}<circle cx="0" cy={cy} r="5" fill="none" stroke="#4b443e" strokeWidth=".7"/><circle cx="0" cy={cy} r="1.5" fill="none" stroke="#4b443e" strokeWidth=".6"/></g>; }
