"use client";
import type { PointerEvent } from "react";
import type { ArrowEntry, Plot, TargetFaceType } from "../scoring-model";
import styles from "./sessions.module.css";

const ringColours: Record<number,string> = {1:"#f4f1e9",.9:"#f4f1e9",.8:"#202020",.7:"#202020",.6:"#49a4cf",.5:"#49a4cf",.4:"#e65a55",.3:"#e65a55",.2:"#f5cf3d",.1:"#f5cf3d"};
const fullRings=[1,.9,.8,.7,.6,.5,.4,.3,.2,.1];
const sixRings=[.6,.5,.4,.3,.2,.1];
const tripleRings=[.5,.4,.3,.2,.1];
const tripleCentres=[-110,0,110] as const;
const views={full_face:{x:-105,y:-105,width:210,height:210},six_ring:{x:-65,y:-65,width:130,height:130},triple_face:{x:-58,y:-168,width:116,height:336}} as const;

export function TargetFace({ arrows, selectedId, faceType, onPlot }: { arrows: ArrowEntry[]; selectedId: string|null; faceType: TargetFaceType; onPlot: (plot: Plot) => void }) {
  const view=views[faceType];
  function place(event: PointerEvent<SVGSVGElement>) {
    const box=event.currentTarget.getBoundingClientRect();
    const svgX=view.x+(event.clientX-box.left)/box.width*view.width;
    const svgY=view.y+(event.clientY-box.top)/box.height*view.height;
    if (faceType==="triple_face") {
      let faceIndex:0|1|2=0;
      if (Math.abs(svgY-tripleCentres[1])<Math.abs(svgY-tripleCentres[faceIndex])) faceIndex=1;
      if (Math.abs(svgY-tripleCentres[2])<Math.abs(svgY-tripleCentres[faceIndex])) faceIndex=2;
      onPlot({x:svgX/100,y:(svgY-tripleCentres[faceIndex])/100,faceIndex});
      return;
    }
    onPlot({x:svgX/100,y:svgY/100});
  }
  const viewBox=`${view.x} ${view.y} ${view.width} ${view.height}`;
  const label=faceType==="triple_face"?"Three-face target":faceType==="six_ring"?"Six-ring target":"Full ten-ring target";
  return <div className={`${styles.targetWrap} ${faceType==="triple_face"?styles.tripleTargetWrap:""}`}>
    <svg className={`${styles.target} ${faceType==="triple_face"?styles.tripleTarget:""}`} viewBox={viewBox} role="img" aria-label={`${label}. Tap to score the current arrow or move the selected arrow.`} onPointerDown={place}>
      {faceType==="triple_face"?tripleCentres.map((cy,index)=><Face key={index} cy={cy} radii={tripleRings}/>):<Face cy={0} radii={faceType==="six_ring"?sixRings:fullRings}/>} 
      {arrows.filter((item)=>item.plot).map((item)=>{
        const cy=faceType==="triple_face"?tripleCentres[item.plot!.faceIndex??1]:0;
        return <g key={item.id} transform={`translate(${item.plot!.x*100} ${cy+item.plot!.y*100})`}>
          <circle r={item.id===selectedId?5.5:4} className={item.id===selectedId?styles.markerSelected:styles.marker}/>
          <text y="1.8" textAnchor="middle" className={styles.markerText}>{item.arrow}</text>
        </g>;
      })}
    </svg>
    <p className={styles.targetHint}>{selectedId?"Tap the target to move this arrow and recalculate its score.":"Tap the target to score the current arrow."}</p>
  </div>;
}

function Face({cy,radii}:{cy:number;radii:number[]}) {
  return <g>{radii.map((radius)=><circle key={radius} cx="0" cy={cy} r={radius*100} fill={ringColours[radius]} stroke="#4b443e" strokeWidth=".7"/>)}
    <circle cx="0" cy={cy} r="5" fill="none" stroke="#4b443e" strokeWidth=".7"/>
    <circle cx="0" cy={cy} r="1.5" fill="none" stroke="#4b443e" strokeWidth=".6"/>
  </g>;
}
