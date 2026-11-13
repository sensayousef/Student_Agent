import {campus, offices, topics, checklist, samples, events, links, seed} from "./data.js";

const day = 86_400_000;
const offsets = [7, 3, 1];
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
export const myTime = value => Date.parse(value + ":00+08:00");
export const dayTime = value => Date.parse(value.slice(0,10) + "T00:00:00Z");
export const daysBetween = (from,to) => (dayTime(to)-dayTime(from))/day;
export const plusDays = (value, count) => new Date(dayTime(value)+count*day).toISOString().slice(0,10) + (value.length > 10 ? value.slice(10) : "");
export function validDate(value) {
  if(typeof value !== "string" || !datePattern.test(value)) return false;
  const time=dayTime(value);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0,10)===value && value>="1900-01-01" && value<="2099-12-31";
}
export function validTime(value) {
  return typeof value==="string" && timePattern.test(value) && validDate(value.slice(0,10)) &&
    Number(value.slice(11,13))<24 && Number(value.slice(14,16))<60;
}
export function renewalPlan(expiry, duration, today) {
  const [year,month,date]=expiry.split("-").map(Number);
  const target=new Date(Date.UTC(year,month-4,1));
  const last=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();
  target.setUTCDate(Math.min(date,last));
  const start=target.toISOString().slice(0,10);
  const remaining=daysBetween(today,expiry);
  const fees=duration>=7 ? [1240,1320,1410,1580] : [1000,1080,1170,1340];
  const tier=remaining>=84?0:remaining>=56?1:remaining>=49?2:remaining>=42?3:-1;
  return {start,remaining,fee:fees[tier]??null,tier:["12 weeks or more","8 to under 12 weeks","7 to under 8 weeks","6 to under 7 weeks"][tier]??null};
}
export function interpretMail(sample) {
  const body=sample.body.toLowerCase();
  if(/no action is needed/.test(body)) return {status:"Received",title:"Documents received",summary:"Immigration has received the documents in this sample.",next:"Check official progress in APSpace."};
  if(/please[^.]*payment receipt/.test(body)) return {status:"Action needed",title:"Payment receipt requested",summary:"Immigration received the renewal documents and requested a copy of the payment receipt.",next:"Review the original message and reply from your APU student email with the requested receipt."};
  if(/please[^.]*passport scans/.test(body)) return {status:"Action needed",title:"Passport scans requested",summary:"Immigration is asking for clear passport scans, including the identification page and current pass.",next:"Review the original message and confirm the required pages before submitting."};
  return {status:"Needs review",title:"Follow up with Immigration",summary:"The message refers to previous correspondence without identifying a specific document.",next:"Open the original message and confirm the next action with Immigration Services."};
}
const normalize = s=>s.toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
export function answerQuestion(question, state) {
  const text=" "+normalize(question)+" ";
  const ranked=topics.map((topic,index)=>{
    const matches=topic.keywords.filter(word=>text.includes(" "+normalize(word)+" "));
    const best=Math.max(0,...matches.map(word=>normalize(word).split(" ").length));
    const score=best*12+Math.min(4,matches.length)-(topic.id==="directions"?10:0);
    return {topic,index,score:best?score:0};
  }).filter(match=>match.score>0).sort((a,b)=>b.score-a.score||a.index-b.index);
  if(ranked.length) {
    const topic=ranked[0].topic;
    const answer={title:topic.title,text:topic.answer,sources:topic.sources,action:topic.action,mode:"Campus guidance"};
    if(state&&topic.id==="coursework"&&/\b(next|my|when)\b/.test(text)) {
      const upcoming=state.tasks.filter(item=>!item.complete&&item.due>=state.clock).sort((a,b)=>a.due.localeCompare(b.due))[0];
      return {...answer,title:"Your next deadline",text:upcoming
        ? upcoming.title+" is due "+upcoming.due.replace("T"," at ")+" MYT."
        : "You have no upcoming open deadlines in this demo.",
        action:upcoming?["Open assignment","coursework/"+encodeURIComponent(upcoming.id)]:answer.action,
        mode:"Demo records"};
    }
    if(state&&topic.id==="events"&&/\b(now|today|happening)\b/.test(text)) {
      const live=events.filter(item=>eventPhase(item,state.clock)==="On now");
      return {...answer,title:"What’s on now",text:live.length
        ? live.map(item=>item.title+" at "+item.venue).join(". ")+"."
        : "There are no sample events running at the current demo time. The Events page shows what’s coming up.",
        mode:"Demo records"};
    }
    return answer;
  }
  return {title:"Ask the Virtual Help Centre",text:"I couldn’t find a matching campus guide for that question. APU’s Virtual Help Centre can route your enquiry to the relevant team.",sources:[["APU Virtual Help Centre",links.help]],action:["Browse campus services","directory"],mode:"Support handoff"};
}
export function taskReminders(task) {
  return offsets.map(offset=>({id:task.id+"|"+task.due+"|"+offset,taskId:task.id,offset,at:plusDays(task.due,-offset),title:task.title}));
}
export function reconcile(state, from=state.clock) {
  const now=myTime(state.clock);
  const previous=myTime(from);
  const available=new Set();
  for(const task of state.tasks) {
    for(const reminder of taskReminders(task)) {
      if(myTime(reminder.at)>now) continue;
      available.add(reminder.id);
      if(!task.complete && (myTime(reminder.at)>previous || (from===state.clock && myTime(reminder.at)===now)) && !state.alerts.some(item=>item.id===reminder.id)) {
        state.alerts.push(reminder);
      }
    }
  }
  state.alerts=state.alerts.filter(item=>available.has(item.id)).sort((a,b)=>b.at.localeCompare(a.at));
  state.read=state.read.filter(id=>available.has(id));
  return state;
}
export const eventPhase=(event,clock)=> clock<event.start?"Upcoming":clock<event.end?"On now":"Ended";

function check(condition, message) { if(!condition) throw new Error(message); }
function shortText(value,max) { return typeof value==="string"?value.trim().slice(0,max):""; }
function toggle(list,id,enabled) { return enabled?[...new Set([...list,id])]:list.filter(item=>item!==id); }
export function applyAction(current, action, answer) {
  check(action && typeof action.type==="string","Choose a valid action.");
  if(action.type==="reset") return seed();
  const next=structuredClone(current);
  switch(action.type) {
    case "clock":
      check(validTime(action.value),"Choose a valid Malaysia date and time.");
      next.clock=action.value;
      return reconcile(next,current.clock);
    case "pass":
      check(validDate(action.expiry),"Enter a valid expiry date.");
      check(Number.isInteger(action.duration)&&action.duration>=3&&action.duration<=12,"Choose a renewal length from 3 to 12 months.");
      next.pass.expiry=action.expiry;
      next.pass.duration=action.duration;
      break;
    case "check":
      check(checklist.some(item=>item[0]===action.id),"Checklist item unavailable.");
      next.pass.checked=toggle(next.pass.checked,action.id,action.enabled===true);
      break;
    case "mail":
      check(samples.some(item=>item.id===action.id),"Choose a sample email.");
      next.pass.mail=action.id;
      break;
    case "event": {
      const event=events.find(item=>item.id===action.id);
      check(event,"Event unavailable.");
      check(action.field==="registered"||action.field==="saved","Choose a valid event action.");
      check(action.field!=="registered"||!action.enabled||eventPhase(event,next.clock)!=="Ended","Registration has closed.");
      next[action.field]=toggle(next[action.field],event.id,action.enabled===true);
      break;
    }
    case "task": {
      const id=shortText(action.id,160);
      const title=shortText(action.title,140);
      const course=shortText(action.course,100);
      check(id&&title&&validTime(action.due),"Enter a title and a valid due date.");
      const existing=next.tasks.find(item=>item.id===id);
      if(existing) {
        existing.title=title;
        existing.course=course;
        existing.due=action.due;
        next.alerts=next.alerts.map(item=>item.taskId===id?{...item,title}:item);
      } else {
        check(next.tasks.length<300,"This demo supports up to 300 assignments.");
        next.tasks.push({id,title,course,due:action.due,complete:false,source:"Manual"});
      }
      break;
    }
    case "task-status": {
      const task=next.tasks.find(item=>item.id===action.id);
      check(task,"Assignment unavailable.");
      task.complete=action.complete===true;
      break;
    }
    case "task-delete":
      next.tasks=next.tasks.filter(item=>item.id!==action.id);
      break;
    case "import":
      check(typeof action.value==="string"&&action.value.length<=250000,"Choose an .ics file under 250 KB.");
      for(const item of parseCalendar(action.value)) {
        const existing=next.tasks.find(task=>task.id===item.id);
        if(existing) {
          Object.assign(existing,item,{complete:existing.complete});
          next.alerts=next.alerts.map(alert=>alert.taskId===item.id?{...alert,title:item.title}:alert);
        } else if(next.tasks.length<300) next.tasks.push({...item,complete:false});
      }
      break;
    case "read":
      next.read=[...new Set([...next.read,...next.alerts.map(item=>item.id)])];
      break;
    case "chat": {
      const question=shortText(action.question,500);
      check(question,"Enter a campus question.");
      next.chat=[...next.chat,{question,answer:answer??answerQuestion(question,next)}].slice(-20);
      break;
    }
    case "chat-clear":
      next.chat=[];
      break;
    default: throw new Error("This action is unavailable.");
  }
  return reconcile(next);
}
const unescapeIcs=s=>s.replace(/\\([nN,;\\])/g,(_,c)=>c.toLowerCase()==="n"?" ":c);
const formatMYT=new Intl.DateTimeFormat("sv-SE",{timeZone:campus.timezone,dateStyle:"short",timeStyle:"short"});
function dateInCalendar(value,params) {
  if(/^\d{8}$/.test(value)) return value.replace(/^(....)(..)(..)$/,"$1-$2-$3")+"T23:59";
  const pieces=value.match(/^(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)?(Z)?$/);
  if(!pieces) return null;
  const local=pieces.slice(1,4).join("-")+"T"+pieces[4]+":"+pieces[5];
  if(!validTime(local)) return null;
  const zone=params.match(/(?:^|;)TZID="?([^";]+)"?/i)?.[1];
  if(pieces[7]||zone?.toUpperCase()==="UTC") return formatMYT.format(new Date(local+"Z")).replace(" ","T");
  if(!zone||["ASIA/KUALA_LUMPUR","ASIA/SINGAPORE","ASIA/KUCHING"].includes(zone.toUpperCase())) return local;
  try {
    const zoneFormat=new Intl.DateTimeFormat("sv-SE",{timeZone:zone,dateStyle:"short",timeStyle:"short"});
    const desired=Date.parse(local+"Z");
    let guess=desired;
    for(let i=0;i<3;i++) guess+=desired-Date.parse(zoneFormat.format(new Date(guess)).replace(" ","T")+"Z");
    if(zoneFormat.format(new Date(guess)).replace(" ","T")===local) return formatMYT.format(new Date(guess)).replace(" ","T");
  } catch { return null; }
  return null;
}
export function parseCalendar(input) {
  check(/BEGIN:VCALENDAR/i.test(input),"The file is missing a valid iCalendar header.");
  const unfolded=input.replace(/\r\n/g,"\n").replace(/\n[ \t]/g,"");
  const blocks=[...unfolded.matchAll(/BEGIN:(VEVENT|VTODO)\n([\s\S]*?)\nEND:\1/gi)];
  const rows=new Map();
  for(const block of blocks.slice(0,300)) {
    const fields=new Map();
    for(const line of block[2].split("\n")) {
      const colon=line.indexOf(":");
      if(colon<0) continue;
      const [name,...params]=line.slice(0,colon).split(";");
      fields.set(name.toUpperCase(),[line.slice(colon+1),params.join(";")]);
    }
    const summary=fields.get("SUMMARY")?.[0];
    const date=fields.get("DUE")??fields.get("DTSTART");
    if(!summary||!date) continue;
    const due=dateInCalendar(...date);
    if(!validTime(due)) continue;
    const title=shortText(unescapeIcs(summary),140);
    if(!title) continue;
    const key=(fields.get("UID")?.[0]||title+"-"+due).slice(0,125);
    const recurrence=fields.get("RECURRENCE-ID")?.[0]?.slice(0,22);
    const id="ics:"+key+(recurrence?"@"+recurrence:"");
    const course=shortText(unescapeIcs(fields.get("CATEGORIES")?.[0]??"Calendar import"),100);
    rows.set(id,{id,title,course,due,source:"Calendar"});
  }
  check(rows.size>0,"No supported assignments or events were found in this file.");
  return [...rows.values()];
}
const escapeIcs=s=>s.replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/([,;])/g,"\\$1");
const utcIcs=s=>new Date(myTime(s)).toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z");
export function eventCalendar(event) {
  return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Campus Compass//Demo Events//EN","BEGIN:VEVENT",
    "UID:"+event.id+"@campus-compass.demo","DTSTAMP:"+utcIcs(campus.clock),
    "DTSTART:"+utcIcs(event.start),"DTEND:"+utcIcs(event.end),"SUMMARY:"+escapeIcs(event.title),
    "LOCATION:"+escapeIcs(event.venue),"DESCRIPTION:"+escapeIcs("Campus Compass sample event. "+event.description),
    "END:VEVENT","END:VCALENDAR",""].join("\r\n");
}
