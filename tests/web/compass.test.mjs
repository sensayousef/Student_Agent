import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { seed, samples, events } from "../../src/web/data.js";
import { applyAction, renewalPlan, answerQuestion, interpretMail, parseCalendar, eventPhase, eventCalendar } from "../../src/web/domain.js";

test("renewal uses calendar months and the published fee boundaries",()=>{
  assert.deepEqual(renewalPlan("2027-02-22",12,"2026-11-22"),{start:"2026-11-22",remaining:92,fee:1240,tier:"12 weeks or more"});
  assert.equal(renewalPlan("2028-05-31",6,"2028-03-09").start,"2028-02-29");
  for(const [date,long,short] of [["2026-12-01",1240,1000],["2026-12-02",1320,1080],["2026-12-29",1320,1080],["2026-12-30",1410,1170],["2027-01-05",1410,1170],["2027-01-06",1580,1340],["2027-01-12",1580,1340],["2027-01-13",null,null]]){
    assert.equal(renewalPlan("2027-02-23",12,date).fee,long,date);
    assert.equal(renewalPlan("2027-02-23",6,date).fee,short,date);
  }
  assert.throws(()=>applyAction(seed(),{type:"pass",expiry:"2027-02-31",duration:12}),/valid expiry/);
});
test("questions route to guidance, personal demo records and support",()=>{
  assert.equal(answerQuestion("How do I renew my Student Pass?").action[1],"pass");
  assert.equal(answerQuestion("Where can I get IT help?").action[1],"directory/tech");
  assert.equal(answerQuestion("Where do I renew my Student Pass?").action[1],"directory/immigration");
  assert.equal(answerQuestion("How can I track my visa status?").title,"Check your official Student Pass progress");
  assert.match(answerQuestion("When is my next deadline?",seed()).text,/Secure Coding lab report/);
  assert.match(answerQuestion("What is happening on campus?",seed()).text,/International Cultural Night/);
  assert.equal(answerQuestion("What is the capital of Norway?").mode,"Support handoff");
  assert.equal(interpretMail(samples[0]).title,"Payment receipt requested");
  assert.equal(interpretMail(samples[1]).title,"Passport scans requested");
  assert.equal(interpretMail(samples[2]).status,"Received");
  assert.equal(interpretMail(samples[3]).status,"Needs review");
});
test("reminders cross Malaysia timestamps once, reschedule and stop after completion",()=>{
  let state=seed();
  const act=action=>{state=applyAction(state,action);};
  act({type:"clock",value:"2026-11-23T23:58"});
  assert.equal(state.alerts.length,0);
  act({type:"clock",value:"2026-11-23T23:59"});
  act({type:"clock",value:"2026-11-23T23:59"});
  assert.equal(state.alerts.length,1);
  assert.equal(state.alerts[0].offset,7);
  act({type:"read"});
  assert.equal(state.read.length,1);
  act({type:"task-status",id:"secure",complete:true});
  act({type:"clock",value:"2026-11-29T23:59"});
  assert.deepEqual(state.alerts.filter(item=>item.taskId==="secure").map(item=>item.offset),[7]);
  act({type:"task",id:"secure",title:"Updated lab",course:"Security",due:"2026-12-07T23:59"});
  assert.equal(state.alerts.filter(item=>item.taskId==="secure").length,0);
  act({type:"task-status",id:"secure",complete:false});
  act({type:"clock",value:"2026-11-30T23:59"});
  assert.equal(state.alerts.filter(item=>item.taskId==="secure").length,1);
});
test("calendar import normalizes UTC and named time zones and updates stable IDs",()=>{
  const source=readFileSync(new URL("../../src/web/sample-moodle.ics",import.meta.url),"utf8");
  const rows=parseCalendar(source);
  assert.deepEqual(rows.map(row=>row.due),["2026-12-02T23:59","2026-12-04T17:00"]);
  assert.equal(parseCalendar(source.replace("Asia/Kuala_Lumpur","America/New_York"))[1].due,"2026-12-05T06:00");
  let state=applyAction(seed(),{type:"import",value:source});
  state=applyAction(state,{type:"task-status",id:rows[0].id,complete:true});
  state=applyAction(state,{type:"import",value:source.replace("20261202T155900Z","20261206T155900Z")});
  assert.equal(state.tasks.length,5);
  assert.equal(state.tasks.find(row=>row.id===rows[0].id).due,"2026-12-06T23:59");
  assert.equal(state.tasks.find(row=>row.id===rows[0].id).complete,true);
  assert.throws(()=>parseCalendar("invalid"),/iCalendar/);
});
test("events save, register, export and close on schedule",()=>{
  const event=events[0];
  assert.equal(eventPhase(event,seed().clock),"On now");
  assert.equal(eventPhase(event,event.end),"Ended");
  let state=applyAction(seed(),{type:"event",id:event.id,field:"registered",enabled:true});
  state=applyAction(state,{type:"event",id:event.id,field:"saved",enabled:true});
  assert.deepEqual(state.registered,[event.id]);
  assert.deepEqual(state.saved,[event.id]);
  assert.match(eventCalendar(event),/DTSTART:20261122T010000Z/);
  state=applyAction(seed(),{type:"clock",value:event.end});
  assert.throws(()=>applyAction(state,{type:"event",id:event.id,field:"registered",enabled:true}),/closed/);
});
test("dashboard greeting has a light surface and readable text colors",()=>{
  const html=readFileSync(new URL("../../src/web/index.html",import.meta.url),"utf8");
  const css=readFileSync(new URL("../../src/web/styles.css",import.meta.url),"utf8");
  assert.match(html,/<meta name="color-scheme" content="light">/);
  assert.match(css,/color-scheme:only light/);
  const luminance=hex=>hex.match(/../g).map(pair=>{
    const channel=parseInt(pair,16)/255;
    return channel<=.04045?channel/12.92:((channel+.055)/1.055)**2.4;
  }).reduce((total,value,index)=>total+value*[.2126,.7152,.0722][index],0);
  const background=css.match(/\.today-intro\{[^}]*background:#([a-f0-9]{3,6})[;}]/i)?.[1];
  assert.ok(background);
  const surface=luminance(background.length===3?[...background].map(letter=>letter.repeat(2)).join(""):background);
  for(const selector of ["h1","p",".date-label"]){
    const escaped=selector.replace(".","\\.");
    const hex=css.match(new RegExp("\\.today-intro "+escaped+"\\{color:#([a-f0-9]{6})\\}","i"))?.[1];
    assert.ok(hex,selector+" must declare its text color");
    assert.ok((surface+.05)/(luminance(hex)+.05)>=4.5,selector+" text contrast");
  }
});

test("the browser entry renders key routes and dispatches a demo question",async()=>{
  const source=["data.js","domain.js","icons.js","app.js"].map(file=>readFileSync(new URL("../../src/web/"+file,import.meta.url),"utf8")
    .replace(/^import .+;\r?\n/gm,"").replace(/^export /gm,"")).join("\n");
  const listeners=new Map(), nodes=new Map(), storage=new Map();
  class Input {}
  class Select {}
  const node=()=>({innerHTML:"",inert:false,focus(){},scrollHeight:200,classList:{add(){},remove(){}}});
  const document={activeElement:null,getElementById:()=>null,querySelector(selector){
    if(selector.startsWith("#overlay "))return null;
    if(!nodes.has(selector))nodes.set(selector,node());
    return nodes.get(selector);
  },addEventListener(name,listener){listeners.set(name,listener);}};
  const location={hash:"",href:"file:///Campus-Compass-Demo.html",protocol:"file:"};
  runInNewContext(source,{document,location,window:{scrollTo(){},addEventListener(name,listener){listeners.set(name,listener);}},
    HTMLInputElement:Input,HTMLSelectElement:Select,structuredClone,URL,Intl,localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},setTimeout:()=>0,clearTimeout(){}});
  const render=(hash,pattern)=>{
    location.hash=hash;
    listeners.get("hashchange")();
    assert.match(nodes.get("#app").innerHTML,pattern,hash);
  };
  assert.match(nodes.get("#app").innerHTML,/Welcome back, Amina/);
  assert.match(nodes.get("#app").innerHTML,/Sunday 22 November/);
  assert.match(nodes.get("#app").innerHTML,/Here.s what.s happening on your campus today/);
  render("#directory/tech",/Opposite Block D/);
  render("#pass",/RM 1,240/);
  render("#pass/inbox",/View original sample/);
  render("#events/workshop",/Register in demo/);
  render("#coursework/secure",/Reminder schedule/);
  render("#assistant",/How can I help/);
  await listeners.get("click")({target:{closest:()=>({dataset:{action:"prompt",value:"How do I renew my Student Pass?"}})}});
  assert.match(nodes.get("#app").innerHTML,/Plan your Student Pass renewal/);
  async function click(action,details={}){
    await listeners.get("click")({target:{closest:()=>({dataset:{action,...details}})}});
    await new Promise(resolve=>setImmediate(resolve));
  }
  render("#pass",/Document checklist/);
  await listeners.get("change")({target:{dataset:{action:"check",id:"receipt"},checked:true}});
  await new Promise(resolve=>setImmediate(resolve));
  assert.match(nodes.get("#app").innerHTML,/3 of 6 steps complete/);
  render("#pass/inbox",/Payment receipt requested/);
  await click("mail-original");
  assert.match(nodes.get("#overlay").innerHTML,/Original sample email/);
  listeners.get("keydown")({key:"Escape"});
  assert.equal(nodes.get("#overlay").innerHTML,"");
  await click("demo");
  await click("clock-next");
  assert.match(nodes.get("#app").innerHTML,/Notifications, 1 unread/);
  render("#events/workshop",/Register in demo/);
  await click("event-register",{id:"workshop"});
  assert.match(nodes.get("#app").innerHTML,/Demo registration confirmed/);
  await click("reset");
  render("#today",/Sunday 22 November/);
  assert.doesNotMatch(nodes.get("#app").innerHTML,/Notifications, 1 unread/);
});
