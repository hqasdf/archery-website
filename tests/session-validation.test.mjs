import test from "node:test";
import assert from "node:assert/strict";
import { validateArrowInput, validateRoundInput, validateSessionArrowCount, validateSessionInput } from "../src/features/sessions/validation.ts";
import { arrowAverage } from "../src/features/sessions/scoring-model.ts";

const id="123e4567-e89b-42d3-a456-426614174000";

test("Session input trims titles and supplies the blank fallback",()=>{
  assert.deepEqual(validateSessionInput({title:"  Evening practice  ",date:"2026-09-22",sessionType:"training"}),{ok:true,value:{title:"Evening practice",date:"2026-09-22",sessionType:"training"}});
  assert.equal(validateSessionInput({title:"   ",date:"2026-09-22",sessionType:"competition"}).value.title,"Practice session");
  assert.equal(validateSessionInput({title:"test",date:"invalid",sessionType:"training"}).ok,false);
  assert.equal(validateSessionInput({title:"test",date:"2026-09-22",sessionType:"invalid"}).ok,false);
});

test("Session Arrow count accepts non-negative whole numbers",()=>{
  assert.deepEqual(validateSessionArrowCount({sessionId:id,arrowCount:72}),{ok:true,value:{sessionId:id,arrowCount:72}});
  assert.equal(validateSessionArrowCount({sessionId:id,arrowCount:0}).ok,true);
  assert.equal(validateSessionArrowCount({sessionId:id,arrowCount:-1}).ok,false);
  assert.equal(validateSessionArrowCount({sessionId:id,arrowCount:1.5}).ok,false);
  assert.equal(validateSessionArrowCount({sessionId:id,arrowCount:2147483648}).ok,false);
});

test("Round input accepts custom formats but validates storage-compatible values",()=>{
  const valid=validateRoundInput({sessionId:id,roundNumber:1,name:" Custom  ",division:"Other",distanceMetres:23,faceDiameterCm:91,faceType:"full_face",ends:4,arrowsPerEnd:7});
  assert.equal(valid.ok,true); assert.equal(valid.value.name,"Custom");
  assert.equal(validateRoundInput({...valid.value,division:"Invalid"}).ok,false);
  assert.equal(validateRoundInput({...valid.value,faceType:"invalid"}).ok,false);
  assert.equal(validateRoundInput({...valid.value,ends:0}).ok,false);
});

test("Arrow input converts X, 10 and Miss without changing plots",()=>{
  const base={roundId:id,endNumber:1,arrowNumber:1,plot:{x:.12,y:-.2,faceIndex:2}};
  const x=validateArrowInput({...base,score:"X"}); assert.equal(x.ok,true); assert.equal(x.value.scorePoints,10); assert.equal(x.value.isX,true); assert.deepEqual(x.value.plot,base.plot);
  const ten=validateArrowInput({...base,score:"10"}); assert.equal(ten.value.scorePoints,10); assert.equal(ten.value.isX,false);
  const miss=validateArrowInput({...base,score:"M"}); assert.equal(miss.value.scorePoints,0); assert.equal(miss.value.isX,false);
});

test("Arrow average derives from entered Arrow scores and counts X as ten",()=>{
  assert.equal(arrowAverage([]),null);
  assert.equal(arrowAverage([{id:"1",end:1,arrow:1,score:"X",plot:null},{id:"2",end:1,arrow:2,score:"8",plot:null},{id:"3",end:1,arrow:3,score:"M",plot:null}]),6);
});

test("Arrow input rejects malformed positions and identifiers",()=>{
  const base={roundId:id,endNumber:1,arrowNumber:1,score:"9"};
  assert.equal(validateArrowInput({...base,plot:{x:Number.NaN,y:0}}).ok,false);
  assert.equal(validateArrowInput({...base,plot:{x:0,y:0,faceIndex:3}}).ok,false);
  assert.equal(validateArrowInput({...base,roundId:"not-a-uuid",plot:null}).ok,false);
  assert.equal(validateArrowInput({...base,score:"11",plot:null}).ok,false);
});
