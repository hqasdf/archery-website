"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session.server";
import { createAuthClient } from "@/lib/supabase/server";
import { isUuid, validateArrowInput, validateRoundInput, validateSessionArrowCount, validateSessionInput, type ArrowInput, type RoundInput, type SessionArrowCountInput, type SessionInput } from "./validation";
import type { ArrowEntry, RoundDraft, SessionDraft } from "./scoring-model";

type Result<T>={ok:true;data:T}|{ok:false;message:string};

export async function createSession(input:SessionInput):Promise<Result<SessionDraft>> {
  const user=await requireUser();
  const valid=validateSessionInput(input);
  if (!valid.ok) return valid;
  try {
    const supabase=await createAuthClient({writable:true});
    const {data,error}=await supabase.from("sessions").insert({user_id:user.id,title:valid.value.title,session_date:valid.value.date,session_type:valid.value.sessionType}).select("id,title,session_date,session_type,arrow_count").single();
    if (error||!data) return failure("The Session could not be created.");
    revalidatePath("/sessions");
    return {ok:true,data:{id:data.id,title:data.title,date:data.session_date,sessionType:data.session_type,arrowCount:data.arrow_count,rounds:[]}};
  } catch { return failure("Session saving is temporarily unavailable."); }
}

export async function updateSessionArrowCount(input:SessionArrowCountInput):Promise<Result<number>> {
  await requireUser();
  const valid=validateSessionArrowCount(input);
  if (!valid.ok) return valid;
  try {
    const supabase=await createAuthClient({writable:true});
    const {data,error}=await supabase.from("sessions").update({arrow_count:valid.value.arrowCount}).eq("id",valid.value.sessionId).select("arrow_count").maybeSingle();
    if (error||!data) return failure("The Session Arrow count could not be saved.");
    revalidatePath("/sessions");
    return {ok:true,data:data.arrow_count};
  } catch { return failure("Session saving is temporarily unavailable."); }
}

export async function createRoundWithEnds(input:RoundInput):Promise<Result<RoundDraft>> {
  await requireUser();
  const valid=validateRoundInput(input);
  if (!valid.ok) return valid;
  try {
    const supabase=await createAuthClient({writable:true});
    const value=valid.value;
    const {data:round,error}=await supabase.from("session_rounds").insert({session_id:value.sessionId,round_number:value.roundNumber,name:value.name,division:value.division,distance_metres:value.distanceMetres,face_diameter_cm:value.faceDiameterCm,face_type:value.faceType,planned_ends:value.ends,arrows_per_end:value.arrowsPerEnd}).select("id").single();
    if (error||!round) return failure("The Round could not be created.");
    const ends=Array.from({length:value.ends},(_,index)=>({session_round_id:round.id,end_number:index+1}));
    const {error:endError}=await supabase.from("session_ends").insert(ends);
    if (endError) {
      await supabase.from("session_rounds").delete().eq("id",round.id);
      return failure("The Round Ends could not be created.");
    }
    revalidatePath("/sessions");
    return {ok:true,data:{id:round.id,roundNumber:value.roundNumber,name:value.name,division:value.division,distanceMetres:value.distanceMetres,faceDiameterCm:value.faceDiameterCm,faceType:value.faceType,ends:value.ends,arrowsPerEnd:value.arrowsPerEnd,arrows:[]}};
  } catch { return failure("Round saving is temporarily unavailable."); }
}

export async function saveArrow(input:ArrowInput):Promise<Result<ArrowEntry>> {
  await requireUser();
  const valid=validateArrowInput(input);
  if (!valid.ok) return valid;
  try {
    const supabase=await createAuthClient({writable:true});
    const {data:end,error:endError}=await supabase.from("session_ends").select("id").eq("session_round_id",valid.value.roundId).eq("end_number",valid.value.endNumber).maybeSingle();
    if (endError||!end) return failure("The planned End could not be found.");
    const plot=valid.value.plot;
    const {data,error}=await supabase.from("arrows").upsert({session_end_id:end.id,arrow_number:valid.value.arrowNumber,score_points:valid.value.scorePoints,is_x:valid.value.isX,plot_x:plot?.x??null,plot_y:plot?.y??null,face_index:plot?.faceIndex??null},{onConflict:"session_end_id,arrow_number"}).select("id").single();
    if (error||!data) return failure("The Arrow was not saved.");
    return {ok:true,data:{id:data.id,end:valid.value.endNumber,arrow:valid.value.arrowNumber,score:valid.value.score,plot:valid.value.plot,syncState:"saved"}};
  } catch { return failure("Arrow saving is temporarily unavailable."); }
}

export async function removeArrow(input:{roundId:string;endNumber:number;arrowNumber:number}):Promise<Result<null>> {
  await requireUser();
  if (!isUuid(input.roundId)||![input.endNumber,input.arrowNumber].every((value)=>Number.isInteger(value)&&value>=1&&value<=32767)) return failure("The Arrow could not be identified.");
  try {
    const supabase=await createAuthClient({writable:true});
    const {data:end,error:endError}=await supabase.from("session_ends").select("id").eq("session_round_id",input.roundId).eq("end_number",input.endNumber).maybeSingle();
    if (endError||!end) return failure("The planned End could not be found.");
    const {error}=await supabase.from("arrows").delete().eq("session_end_id",end.id).eq("arrow_number",input.arrowNumber);
    return error?failure("The Arrow could not be removed."):{ok:true,data:null};
  } catch { return failure("Arrow removal is temporarily unavailable."); }
}

export async function deleteRound(id:string):Promise<Result<null>> { return deleteOwned("session_rounds",id); }
export async function deleteSession(id:string):Promise<Result<null>> { return deleteOwned("sessions",id); }

async function deleteOwned(table:"sessions"|"session_rounds",id:string):Promise<Result<null>> {
  await requireUser();
  if (!isUuid(id)) return failure(`The ${table==="sessions"?"Session":"Round"} could not be identified.`);
  try {
    const supabase=await createAuthClient({writable:true});
    const {error}=await supabase.from(table).delete().eq("id",id);
    if (error) return failure(`${table==="sessions"?"Session":"Round"} deletion failed.`);
    revalidatePath("/sessions");
    return {ok:true,data:null};
  } catch { return failure("Deletion is temporarily unavailable."); }
}
function failure(message:string):{ok:false;message:string} { return {ok:false,message}; }
