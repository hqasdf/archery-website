import Svg, { Circle, Path } from "react-native-svg";

export type ArcIconName = "sessions" | "analytics" | "counter" | "organization" | "profile" | "settings" | "trash";

export function ArcIcon({ name, color, size = 23 }: { name: ArcIconName; color: string; size?: number }) {
  const common = { stroke: color, strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  return <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden>
    {name === "sessions" ? <><Path {...common} d="M6 4.5h12a1.5 1.5 0 0 1 1.5 1.5v14H4.5V6A1.5 1.5 0 0 1 6 4.5Z"/><Path {...common} d="M8 9h8M8 13h8M8 17h5"/></> : null}
    {name === "analytics" ? <><Path {...common} d="M4 20V4M4 20h17"/><Path {...common} d="m7 16 4-5 3 2 5-7"/><Circle cx="7" cy="16" r="1" fill={color}/><Circle cx="11" cy="11" r="1" fill={color}/><Circle cx="14" cy="13" r="1" fill={color}/><Circle cx="19" cy="6" r="1" fill={color}/></> : null}
    {name === "counter" ? <><Circle {...common} cx="12" cy="12" r="9"/><Path {...common} d="M12 7v10M7 12h10"/></> : null}
    {name === "organization" ? <><Circle {...common} cx="9" cy="8" r="3"/><Path {...common} d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5M16 5.5a3 3 0 0 1 0 5.8M17 14c2.2.6 3.5 2.2 3.5 4.5"/></> : null}
    {name === "profile" ? <><Circle {...common} cx="12" cy="8" r="3.5"/><Path {...common} d="M4.5 20c.4-4 3-6 7.5-6s7.1 2 7.5 6"/></> : null}
    {name === "settings" ? <><Circle {...common} cx="12" cy="12" r="3"/><Path {...common} d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-2.6v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H6.2v-2.6h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.2h2.6v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2v2.6h-.2a1.7 1.7 0 0 0-1.5 1Z"/></> : null}
    {name === "trash" ? <><Path {...common} d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></> : null}
  </Svg>;
}
