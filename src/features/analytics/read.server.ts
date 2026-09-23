import "server-only";
import { readSessions } from "@/features/sessions/read.server";

export function readAnalyticsSessions() {
  return readSessions();
}
