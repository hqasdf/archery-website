import type { Metadata } from "next";
import { ArrowCounter } from "@/features/arrow-counter/components/arrow-counter";

export const metadata: Metadata = { title: "Arrow Counter" };

export default function ArrowCounterPage() {
  return <ArrowCounter/>;
}
