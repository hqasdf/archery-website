import type { TargetFaceType } from "@arc-track/core/scoring";
import { View } from "react-native";
import Svg, { Circle, G, Line } from "react-native-svg";
import { targetViews, tripleCentres } from "./native-target-geometry";

type Point = { id: string; x: number; y: number; faceIndex?: 0 | 1 | 2 };
type Props = {
  faceType: TargetFaceType;
  arrows: Point[];
  centre?: { x: number; y: number } | null;
  flyerIds?: ReadonlySet<string>;
};

const full = [1, .9, .8, .7, .6, .5, .4, .3, .2, .1];
const six = [.6, .5, .4, .3, .2, .1];
const triple = [.5, .4, .3, .2, .1];
const colours: Record<number, string> = {
  1: "#f4f1e9", .9: "#f4f1e9", .8: "#202020", .7: "#202020",
  .6: "#49a4cf", .5: "#49a4cf", .4: "#e65a55", .3: "#e65a55",
  .2: "#f5cf3d", .1: "#f5cf3d",
};

export function AnalysisTarget({ faceType, arrows, centre, flyerIds }: Props) {
  const view = targetViews[faceType];
  const faces = faceType === "triple_face" ? tripleCentres : [0];
  const rings = faceType === "triple_face" ? triple : faceType === "six_ring" ? six : full;
  const height = faceType === "triple_face" ? 360 : 260;
  return <View accessible accessibilityLabel={`${faceType.replaceAll("_", " ")} grouping with ${arrows.length} plotted Arrows`}>
    <Svg width="100%" height={height} viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`} pointerEvents="none">
      {faces.map((cy) => <G key={cy}>
        {rings.map((radius) => <Circle key={radius} cx={0} cy={cy} r={radius * 100} fill={colours[radius]} stroke="#4b443e" strokeWidth={.7} />)}
        <Circle cx={0} cy={cy} r={5} fill="none" stroke="#4b443e" strokeWidth={.7} />
        {centre ? <G>
          <Line x1={0} y1={cy} x2={centre.x * 100} y2={cy + centre.y * 100} stroke="#306b60" strokeWidth={1.2} />
          <Circle cx={centre.x * 100} cy={cy + centre.y * 100} r={3.5} fill="#fff" stroke="#306b60" strokeWidth={1.5} />
        </G> : null}
      </G>)}
      {arrows.map((arrow) => {
        const cy = faceType === "triple_face" ? tripleCentres[arrow.faceIndex ?? 1] : 0;
        const flyer = flyerIds?.has(arrow.id) ?? false;
        return <Circle key={arrow.id} cx={arrow.x * 100} cy={cy + arrow.y * 100} r={flyer ? 4 : 3}
          fill={flyer ? "#c55c25" : "#263b36"} stroke="#fff" strokeWidth={1} />;
      })}
    </Svg>
  </View>;
}
