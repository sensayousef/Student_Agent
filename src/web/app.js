import {campus, links, offices, checklist, samples, events, seed} from "./data.js";
import {applyAction, daysBetween, renewalPlan, interpretMail, taskReminders, eventPhase, eventCalendar, plusDays, myTime} from "./domain.js";
import {icon} from "./icons.js";

const $=selector=>document.querySelector(selector);
const escape=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
const app=$("#app"), overlay=$("#overlay"), toast=$("#toast");
const key="campus-compass-apu-v1";
let state=seed(), api=false, page="today", detail="", modal=null, busy=false, mobile=false;
let directoryQuery="", directoryFilter="All", eventFilter="All events", eventCategory="All", taskFilter="Open";
let draft="", toastTimer, focusAfterRender="", dialogOrigin=null;
const nav=[
  ["today","Today","dashboard"],["assistant","Ask Compass","sparkles"],["directory","Campus directory","pin"],
  ["pass","Student Pass","passport"],["events","Campus events","calendar"],["coursework","Coursework","graduation"]
];
const formats={
  long:new Intl.DateTimeFormat("en-GB",{timeZone:campus.timezone,weekday:"long",day:"numeric",month:"long"}),
  date:new Intl.DateTimeFormat("en-GB",{timeZone:campus.timezone,day:"numeric",month:"short",year:"numeric"}),
  short:new Intl.DateTimeFormat("en-GB",{timeZone:campus.timezone,day:"numeric",month:"short"}),
  month:new Intl.DateTimeFormat("en-GB",{timeZone:campus.timezone,month:"short"}),
  day:new Intl.DateTimeFormat("en-GB",{timeZone:campus.timezone,day:"2-digit"}),
  time:new Intl.DateTimeFormat("en-MY",{timeZone:campus.timezone,hour:"numeric",minute:"2-digit",hour12:true})
};
const formatted=(value,style="date")=>formats[style].format(new Date(myTime(value.length===10?value+"T12:00":value)));
const at=(value)=>formatted(value,"short")+" · "+formatted(value,"time")+" MYT";
const badge=(label,tone="lavender")=>`<span class="badge ${tone}">${escape(label)}</span>`;
const tile=(name,tone="lavender",size=21)=>`<span class="tile ${tone}">${icon(name,size)}</span>`;
const ext=(label,url,style="text-link")=>`<a class="${style}" href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(label)}${icon("external",15)}</a>`;
const go=(label,target,style="text-link",glyph="arrow")=>`<a class="${style}" href="#${escape(target)}">${escape(label)}${icon(glyph,16)}</a>`;
const button=(label,action,style="btn secondary",glyph="",attrs="")=>`<button type="button" class="${style}" data-action="${action}" ${attrs}>${glyph?icon(glyph,17):""}${escape(label)}</button>`;
const iconButton=(label,action,glyph,attrs="")=>`<button type="button" class="icon-button" data-action="${action}" aria-label="${escape(label)}" title="${escape(label)}" ${attrs}>${icon(glyph,19)}</button>`;
const prompts=["How do I renew my Student Pass?","Where can I get IT help?","What’s happening on campus?","When is my next deadline?"];
const sourceList=sources=>`<div class="source-list">${sources.map(([name,url])=>ext(name,url)).join("")}</div>`;
const blank=(title,text,glyph="info")=>`<div class="empty">${tile(glyph)}<strong>${title}</strong><p>${text}</p></div>`;
const subtitle=(title,text,tools="")=>`<div class="page-intro"><div><h1>${title}</h1><p>${text}</p></div>${tools}</div>`;
const section=(title,text="",action="")=>`<div class="section-head"><div><h2>${title}</h2>${text?`<p>${text}</p>`:""}</div>${action}</div>`;
const dueText=task=>{
  const days=daysBetween(state.clock,task.due);
  if(task.complete) return "Completed";
  if(task.due<state.clock) return "Overdue";
  return days===0?"Due today":days===1?"Due tomorrow":"Due in "+days+" days";
};
const mail=()=>samples.find(item=>item.id===state.pass.mail)??samples[0];
const notificationCount=()=>state.alerts.filter(alert=>!state.read.includes(alert.id)).length;

function shell(content) {
  return `<div class="shell">
    <aside id="student-navigation" class="sidebar ${mobile?"mobile-open":""}" aria-label="Student navigation">
      <a class="brand" href="#today"><span class="brand-mark">${icon("compass",25)}</span><span>Campus Compass<small>Student portal</small></span></a>
      <div class="campus-switch"><span class="campus-logo">A</span><span><strong>APU Campus</strong><small>Kuala Lumpur, Malaysia</small></span></div>
      <div class="nav-caption">WORKSPACE</div>
      <nav>${nav.map(([id,label,glyph])=>`<a href="#${id}" class="nav-link ${page===id?"active":""}" ${page===id?'aria-current="page"':""}>${icon(glyph,19)}<span>${label}</span>${page===id?'<span class="active-dot"></span>':""}</a>`).join("")}</nav>
      <div class="side-bottom">
        <a class="nav-link support" href="${links.help}" target="_blank" rel="noopener noreferrer">${icon("headset",19)}<span>Get help</span>${icon("external",14)}</a>
        <button class="profile" type="button" data-action="demo" aria-label="Open demo controls"><span class="avatar">AM</span><span><strong>Amina Malik</strong><small>Demo student</small></span>${icon("settings",16)}</button>
      </div>
    </aside>
    ${mobile?'<button class="mobile-shade" data-action="menu" aria-label="Close navigation"></button>':""}
    <div class="workspace">
      <header class="topbar">
        <div class="breadcrumb">${iconButton(mobile?"Close navigation":"Open navigation","menu","menu",`aria-expanded="${mobile}" aria-controls="student-navigation"`)}<span class="crumb-parent">Student portal</span>${icon("chevron",14)}<strong>${nav.find(item=>item[0]===page)?.[1]??"Today"}</strong></div>
        <div class="top-actions">
          <button class="clock-chip" data-action="demo" type="button" title="Open demo clock">${icon("clock",16)}<span>Demo clock</span></button>
          <button class="icon-button bell" data-action="notifications" type="button" aria-label="Notifications${notificationCount()?", "+notificationCount()+" unread":""}">${icon("bell",20)}${notificationCount()?'<span class="notification-dot">'+notificationCount()+'</span>':""}</button>
          <button class="avatar top-avatar" data-action="demo" type="button" aria-label="Open demo settings">AM</button>
        </div>
      </header>
      <main id="main" tabindex="-1">${content}</main>
    </div>
  </div>`;
}
function eventCards() {
  const list=events.filter(event=>(eventCategory==="All"||eventCategory===event.category)&&(
    eventFilter==="All events" ? eventPhase(event,state.clock)!=="Ended" :
    eventFilter==="Saved" ? state.saved.includes(event.id)||state.registered.includes(event.id) : eventPhase(event,state.clock)===eventFilter
  ));
  return list.length?list.map(event=>`<article class="panel event-card"><div class="event-art ${event.theme}"><span class="event-shape"></span><span class="event-glyph">${icon(event.icon,43)}</span>${badge(eventPhase(event,state.clock),eventPhase(event,state.clock)==="On now"?"mint":"muted")}</div>
    <div class="event-body"><span class="eyebrow">${event.category}</span><h2>${event.title}</h2><div class="meta-list"><span>${icon("calendar",16)} ${at(event.start)}</span><span>${icon("pin",16)} ${event.venue}</span></div><div class="event-foot">${go("View event","events/"+event.id)}${iconButton(state.saved.includes(event.id)?"Remove saved event":"Save event","event-save","bookmark",`data-id="${event.id}" aria-pressed="${state.saved.includes(event.id)}"`)}</div></div></article>`).join(""):blank("No matching events","Try another filter or adjust the demo clock.","calendar");
}
function eventsPage() {
  return subtitle("Campus events","Discover what’s on now, what’s coming up and what you’ve saved.")+
  `<div class="toolbar">${tabs(["All events","On now","Upcoming","Saved"],eventFilter,"event-filter","Event timing")}
    <label class="filter-select"><span>Category</span><select data-action="event-category">${["All","Culture","Workshop","Careers"].map(value=>`<option ${value===eventCategory?"selected":""}>${value}</option>`).join("")}</select></label></div>
    <div class="card-grid">${eventCards()}</div>`;
}
function eventDetail(event) {
  const registered=state.registered.includes(event.id), saved=state.saved.includes(event.id), phase=eventPhase(event,state.clock);
  return go("Back to events","events","back-link","chevron")+subtitle(event.title,event.category+" · Sample campus event",badge(phase,phase==="On now"?"mint":"lavender"))+
  `<div class="content-grid"><section class="panel event-card event-detail"><div class="event-art ${event.theme}"><span class="event-shape"></span><span class="event-glyph">${icon(event.icon,60)}</span></div><div class="padded"><h2>About this event</h2><p class="body-copy">${event.description}</p><div class="button-row">${phase!=="Ended"||registered?button(registered?"Cancel demo registration":"Register in demo","event-register","btn primary",registered?"check":"plus",`data-id="${event.id}"`):""}${button(saved?"Remove from saved":"Save event","event-save","btn secondary","bookmark",`data-id="${event.id}"`)}${button("Download calendar entry","event-calendar","btn secondary","download",`data-id="${event.id}"`)}</div></div></section>
  <section class="panel padded">${section("Event details")}<div class="detail-list">
    <div>${tile("calendar","lavender")}<span><b>When</b><small>${at(event.start)} – ${event.start.slice(0,10)===event.end.slice(0,10)?formatted(event.end,"time"):at(event.end)}</small></span></div>
    <div>${tile("pin","blue")}<span><b>Venue</b><small>${event.venue}</small></span></div>
    <div>${tile("briefcase","mint")}<span><b>Organizer</b><small>${event.organizer}</small></span></div></div>
    ${registered?`<div class="notice success">${icon("check",18)} Demo registration confirmed.</div>`:""}${ext("Open official APSpace events",links.apspace)}</section></div>`;
}
function taskRow(task) {
  return `<div class="task-row"><a href="#coursework/${encodeURIComponent(task.id)}" class="task-main">${tile(task.complete?"check":"clipboard",task.complete?"mint":"blue")}<div class="row-text"><strong>${escape(task.title)}</strong><span>${escape(task.course||"Coursework")} · ${at(task.due)} · ${task.source}</span></div></a>${badge(dueText(task),task.complete?"mint":task.due<state.clock?"sand":"lavender")}${iconButton(task.complete?"Reopen "+task.title:"Complete "+task.title,"task-toggle",task.complete?"refresh":"check",`data-id="${escape(task.id)}"`)}</div>`;
}
function coursework() {
  const tasks=state.tasks.filter(task=>taskFilter==="All"||(taskFilter==="Completed"?task.complete:!task.complete)).sort((a,b)=>a.due.localeCompare(b.due));
  return subtitle("Coursework","Track deadlines and see when your reminders are scheduled.",`<div class="button-row">${button("Import calendar","import","btn secondary","upload")}${button("Add assignment","new-task","btn primary","plus")}</div>`)+
  `<div class="content-grid tasks-grid"><section class="panel padded">${section("Assignments")}${tabs(["Open","Completed","All"],taskFilter,"task-filter","Assignment status")}<div class="task-list">${tasks.length?tasks.map(taskRow).join(""):blank("No assignments here","Add a deadline or select another status.","clipboard")}</div></section>
  <section class="panel padded">${section("In-app reminders","Scheduled in Malaysia time.")}<div class="reminder-steps">${[7,3,1].map(count=>`<div><span>${count}</span><small>${count===1?"day":"days"} before</small></div>`).join("")}</div>
  <p class="body-copy">Open an assignment to see its reminder dates. Use the demo clock to advance to the next alert.</p>${button("Open demo clock","demo","btn secondary","clock")}${ext("Open APU Moodle",links.moodle)}</section></div>`;
}
function taskDetail(task) {
  return go("Back to coursework","coursework","back-link","chevron")+
    subtitle(escape(task.title),escape(task.course||"Coursework")+" · "+task.source,badge(dueText(task),task.complete?"mint":"lavender"))+
    `<div class="content-grid tasks-grid"><section class="panel padded">${section("Assignment details")}<form data-form="task" class="stack-form" data-id="${escape(task.id)}"><label>Title<input name="title" value="${escape(task.title)}" maxlength="140" required></label><label>Course<input name="course" value="${escape(task.course)}" maxlength="100"></label><label>Due date and time (MYT)<input name="due" type="datetime-local" value="${task.due}" required></label><div class="button-row"><button class="btn primary" type="submit">Save changes</button>${button(task.complete?"Reopen assignment":"Mark complete","task-toggle","btn secondary",task.complete?"refresh":"check",`data-id="${escape(task.id)}"`)}</div></form><div class="button-row">${task.source==="Moodle"?ext("Open APU Moodle",links.moodle):""}${button("Delete assignment","task-delete","btn quiet","trash",`data-id="${escape(task.id)}"`)}</div></section>
    <section class="panel padded">${section("Reminder schedule")}${task.complete?blank("Assignment complete","Future reminders are paused.","check"):`<div class="detail-list">${taskReminders(task).map(reminder=>`<div>${tile("bell","lavender")}<span><b>${reminder.offset} ${reminder.offset===1?"day":"days"} before</b><small>${at(reminder.at)}</small></span>${state.alerts.some(item=>item.id===reminder.id)?badge("Delivered","mint"):reminder.at<state.clock?badge("Past","muted"):""}</div>`).join("")}</div>`}</section></div>`;
}
function notifications() {
  return `<div class="notification-list">${state.alerts.length?state.alerts.map(alert=>`<a class="action-row" href="#coursework/${encodeURIComponent(alert.taskId)}" data-action="dismiss-dialog">${tile("bell","lavender",18)}<div class="row-text"><strong>${escape(alert.title)}</strong><span>${alert.offset} ${alert.offset===1?"day":"days"} before · ${at(alert.at)}</span></div>${state.read.includes(alert.id)?"":badge("New","lavender")}</a>`).join(""):blank("You’re all caught up","Advance the demo clock to see a coursework reminder.","bell")}</div>
  ${notificationCount()?button("Mark all as read","read","btn secondary","check"):""}`;
}
function renderDialog() {
  if(!modal){overlay.innerHTML="";app.inert=false;return;}
  let title="", content="";
  if(modal.kind==="demo"){
    title="Demo controls";
    content=`<p>Change the Malaysia time used for events and coursework reminders.</p><form class="stack-form" data-form="clock"><label>Demo time (MYT)<input type="datetime-local" name="clock" required value="${state.clock}"></label><button type="submit" class="btn primary">Set demo time</button></form><div class="button-row">${button("Advance one day","clock-day","btn secondary","arrow")}${button("Jump to next reminder","clock-next","btn secondary","bell")}</div><hr><p>Restore the original assignments, emails and events for the next run.</p>${button("Reset demo","confirm-reset","btn quiet","refresh")}`;
  } else if(modal.kind==="notifications"){
    title="Notifications";content=notifications();
  } else if(modal.kind==="mail"){
    const email=mail();title="Original sample email";content=`<div class="mail-original"><p><b>From</b> ${email.sender} &lt;${email.email}&gt;</p><p><b>Received</b> ${at(email.at)}</p><p><b>Subject</b> ${email.subject}</p><hr><p>${email.body}</p></div>`;
  } else if(modal.kind==="import"){
    title="Import coursework calendar";content=`<p>Select an iCalendar (.ics) export. Importing the same entry again updates its deadline.</p><form class="stack-form" data-form="import"><label>Calendar file<input type="file" name="calendar" accept=".ics,text/calendar" required></label><button class="btn primary" type="submit">Import calendar</button></form><div class="button-row">${button("Import sample file","sample-import","btn secondary","upload")}<a class="text-link" href="./sample-moodle.ics" download>Download sample .ics ${icon("download",16)}</a></div>`;
  } else if(modal.kind==="new-task"){
    title="Add assignment";content=`<form class="stack-form" data-form="task"><label>Title<input name="title" required maxlength="140" placeholder="Assignment title"></label><label>Course<input name="course" maxlength="100" placeholder="Course name"></label><label>Due date and time (MYT)<input name="due" type="datetime-local" required value="${plusDays(state.clock,7).slice(0,10)}T23:59"></label><button class="btn primary" type="submit">Add assignment</button></form>`;
  } else if(modal.kind==="confirm-reset"){
    title="Reset demo?";content=`<p>This restores the opening state and clears your demo changes.</p><div class="button-row">${button("Reset demo","reset","btn primary","refresh")}${button("Cancel","dismiss-dialog")}</div>`;
  } else if(modal.kind==="confirm-delete"){
    title="Delete assignment?";content=`<p>The assignment and its reminders will be removed from this demo session.</p><div class="button-row">${button("Delete assignment","delete-confirmed","btn primary","trash",`data-id="${escape(modal.id)}"`)}${button("Cancel","dismiss-dialog")}</div>`;
  }
  app.inert=true;
  overlay.innerHTML=`<div class="dialog-shade" data-action="backdrop"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div class="dialog-heading"><h2 id="dialog-title">${title}</h2>${iconButton("Close dialog","dismiss-dialog","close")}</div><div class="dialog-content">${content}</div></section></div>`;
  $("#overlay .dialog button")?.focus({preventScroll:true});
}
function render() {
  const active=document.activeElement;
  const selection=active instanceof HTMLInputElement&&active.type==="text"?[active.selectionStart,active.selectionEnd]:null;
  const name=active?.id;
  const action=active?.dataset?.action;
  const value=active?.dataset?.value;
  const id=active?.dataset?.id;
  let content;
  if(page==="today") content=today();
  else if(page==="assistant") content=assistant();
  else if(page==="directory"){const office=offices.find(item=>item.id===detail);content=office?officeDetail(office):directory();}
  else if(page==="pass") content=passPage();
  else if(page==="events"){const event=events.find(item=>item.id===detail);content=event?eventDetail(event):eventsPage();}
  else if(page==="coursework"){const task=state.tasks.find(item=>item.id===detail);content=task?taskDetail(task):coursework();}
  app.innerHTML=shell(content);
  renderDialog();
  if(page==="assistant"&&state.chat.length+Number(busy)>0){const body=$("#chat-body");body.scrollTop=body.scrollHeight;}
  if(!modal&&focusAfterRender){$(focusAfterRender)?.focus({preventScroll:true});focusAfterRender="";}
  else if(!modal&&name){const next=document.getElementById(name);next?.focus({preventScroll:true});if(selection&&next instanceof HTMLInputElement)next.setSelectionRange(...selection);}
  else if(!modal&&action){
    const replacement=[...app.querySelectorAll("[data-action]")].find(element=>
      element.dataset.action===action&&element.dataset.value===value&&element.dataset.id===id);
    (replacement??$("#main"))?.focus({preventScroll:true});
  }
}
function notify(message) {
  if(!message) return;
  clearTimeout(toastTimer);
  toast.textContent=message;
  toast.classList.add("visible");
  toastTimer=setTimeout(()=>toast.classList.remove("visible"),3300);
}
function route() {
  if(location.hash==="#main"){ $("#main")?.focus(); return; }
  const [requested,raw=""]=location.hash.slice(1).split("/");
  page=nav.some(item=>item[0]===requested)?requested:"today";
  try{detail=decodeURIComponent(raw);}catch{detail="";}
  modal=null;mobile=false;
  if(!focusAfterRender)focusAfterRender="#main";
  render();
  window.scrollTo(0,0);
}
function navigate(target) {
  if(location.hash==="#"+target){route();return;}
  location.hash=target;
}
function openDialog(kind,id) {
  if(!modal) dialogOrigin=document.activeElement;
  modal={kind,id};renderDialog();
}
function closeDialog() {
  modal=null;renderDialog();
  const destination=dialogOrigin?.isConnected?dialogOrigin:$("#main");
  destination?.focus({preventScroll:true});
  dialogOrigin=null;
}
async function commit(action, success="", close=false) {
  if(busy) return false;
  busy=true;
  if(action.type==="chat"){draft=action.question;render();}
  try {
    await connectApi;
    let next;
    if(api) {
      const response=await fetch("./api/action",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(action)});
      next=await response.json();
      if(!response.ok) throw new Error(next.error||"This action could not be saved.");
    } else {
      next=applyAction(state,action);
      try{localStorage.setItem(key,JSON.stringify(next));}catch{}
    }
    const before=notificationCount();
    state=next;
    if(close){modal=null;focusAfterRender="#main";}
    if(action.type==="reset"){directoryQuery="";directoryFilter="All";eventFilter="All events";eventCategory="All";taskFilter="Open";navigate("today");}
    const difference=notificationCount()-before;
    notify(action.type==="clock"&&difference>0?difference+" new coursework reminder"+(difference===1?"":"s"):success);
    return true;
  } catch(error) {notify(error.message||"Something went wrong.");return false;}
  finally {busy=false;draft="";if(action.type==="chat"&&page==="assistant")focusAfterRender="#chat-question";render();}
}
function ask(question) {
  if(!question.trim()||busy)return;
  if(page!=="assistant"){
    page="assistant";detail="";location.hash="assistant";
  }
  return commit({type:"chat",question:question.trim()});
}
const downloadCalendar=event=>{
  const url=URL.createObjectURL(new Blob([eventCalendar(event)],{type:"text/calendar"}));
  const link=document.createElement("a");link.href=url;link.download=event.id+"-campus-compass.ics";link.click();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
  notify("Calendar entry downloaded.");
};
document.addEventListener("click",async event=>{
  const target=event.target.closest("[data-action]");
  if(!target||target instanceof HTMLInputElement||target instanceof HTMLSelectElement)return;
  const {action,id,value}=target.dataset;
  if(action==="backdrop"){if(event.target===target)closeDialog();return;}
  if(action==="dismiss-dialog"){closeDialog();return;}
  if(action==="menu"){
    mobile=!mobile;
    focusAfterRender=mobile?"#student-navigation nav a[aria-current]":".breadcrumb [data-action=menu]";
    render();return;
  }
  if(action==="demo"||action==="notifications"||action==="import"||action==="new-task"||action==="confirm-reset"){openDialog(action);return;}
  if(action==="mail-original"){openDialog("mail");return;}
  if(action==="prompt"){ask(value);return;}
  if(action==="chat-clear"){commit({type:"chat-clear"},"Chat cleared.");return;}
  if(action==="directory-filter"){directoryFilter=value;render();return;}
  if(action==="event-filter"){eventFilter=value;render();return;}
  if(action==="task-filter"){taskFilter=value;render();return;}
  if(action==="pass-tab"){navigate(value==="Sample inbox"?"pass/inbox":"pass");return;}
  if(action==="select-mail"){commit({type:"mail",id});return;}
  if(action==="event-save"||action==="event-register"){
    const field=action==="event-save"?"saved":"registered",enabled=!state[field].includes(id);
    commit({type:"event",id,field,enabled},field==="saved"?(enabled?"Event saved.":"Event removed from saved."):(enabled?"Demo registration confirmed.":"Demo registration cancelled."));return;
  }
  if(action==="event-calendar"){const item=events.find(entry=>entry.id===id);if(item)downloadCalendar(item);return;}
  if(action==="task-toggle"){const task=state.tasks.find(item=>item.id===id);if(task)commit({type:"task-status",id,complete:!task.complete},task.complete?"Assignment reopened.":"Assignment completed.");return;}
  if(action==="task-delete"){openDialog("confirm-delete",id);return;}
  if(action==="delete-confirmed"){if(await commit({type:"task-delete",id},"Assignment deleted.",true))navigate("coursework");return;}
  if(action==="read"){commit({type:"read"},"Notifications marked as read.");return;}
  if(action==="reset"){commit({type:"reset"},"Demo reset.",true);return;}
  if(action==="clock-day"){commit({type:"clock",value:plusDays(state.clock,1)},"Demo clock advanced.",true);return;}
  if(action==="clock-next"){
    const next=state.tasks.filter(task=>!task.complete).flatMap(taskReminders).map(item=>item.at).filter(time=>time>state.clock).sort()[0];
    if(next)commit({type:"clock",value:next},"Demo clock advanced.",true);else notify("No future reminders are scheduled.");return;
  }
  if(action==="sample-import"){
    try{const response=await fetch(sampleCalendarUrl);if(!response.ok)throw Error();await commit({type:"import",value:await response.text()},"Sample coursework imported.",true);}catch{notify("The sample file could not be loaded.");}
  }
});
document.addEventListener("input",event=>{
  if(event.target.id==="directory-search"){directoryQuery=event.target.value;$("#office-results").innerHTML=officeCards();}
});
document.addEventListener("change",event=>{
  const {action,id}=event.target.dataset;
  if(action==="check")commit({type:"check",id,enabled:event.target.checked});
  if(action==="event-category"){eventCategory=event.target.value;render();}
});
document.addEventListener("submit",async event=>{
  const form=event.target;
  const type=form.dataset.form;
  if(!type)return;
  event.preventDefault();
  const fields=new FormData(form);
  if(type==="question"){ask(String(fields.get("question")));return;}
  if(type==="pass"){commit({type:"pass",expiry:fields.get("expiry"),duration:Number(fields.get("duration"))},"Renewal plan updated.");return;}
  if(type==="clock"){commit({type:"clock",value:fields.get("clock")},"Demo time updated.",true);return;}
  if(type==="task"){
    const id=form.dataset.id??"task:"+(crypto.randomUUID?.()??Date.now()+"-"+Math.random().toString(36).slice(2));
    const saved=await commit({type:"task",id,title:fields.get("title"),course:fields.get("course"),due:fields.get("due")},form.dataset.id?"Assignment updated.":"Assignment added.",!form.dataset.id);
    if(saved&&!form.dataset.id)navigate("coursework/"+encodeURIComponent(id));return;
  }
  if(type==="import"){
    const file=fields.get("calendar");
    if(!file||file.size>250000){notify("Choose an .ics file under 250 KB.");return;}
    try{await commit({type:"import",value:await file.text()},"Coursework calendar imported.",true);}catch{notify("This calendar file could not be opened.");}
  }
});
document.addEventListener("keydown",event=>{
  if(event.key==="Escape"&&modal){closeDialog();return;}
  if(event.key==="Escape"&&mobile){
    mobile=false;focusAfterRender=".breadcrumb [data-action=menu]";render();return;
  }
  if(event.key==="Tab"&&modal){
    const elements=[...overlay.querySelectorAll("button:not([disabled]), a[href], input, select")];
    const first=elements[0],last=elements.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
    if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }
});
function quickCard(label,desc,target,glyph,tone) {
  return `<a class="quick-card panel" href="#${target}">${tile(glyph,tone)}<div><strong>${label}</strong><span>${desc}</span></div><span class="quick-arrow">${icon("arrow",17)}</span></a>`;
}
function row(glyph,tone,title,description,target,status,statusTone) {
  return `<a class="action-row" href="#${target}">${tile(glyph,tone,19)}<div class="row-text"><strong>${escape(title)}</strong><span>${escape(description)}</span></div>${status?badge(status,statusTone):""}${icon("chevron",16)}</a>`;
}
function today() {
  const report=[...state.tasks].filter(task=>!task.complete).sort((a,b)=>a.due.localeCompare(b.due))[0];
  const message=interpretMail(mail());
  const upcoming=events.filter(event=>eventPhase(event,state.clock)!=="Ended").slice(0,3);
  return `<div class="today-intro"><div><div class="date-label">${icon("calendar",15)} ${formatted(state.clock,"long")}</div><h1>Welcome back, ${campus.student}.</h1><p>Here’s what’s happening on your campus today.</p></div>${badge("APU student demo","muted")}</div>
  <section class="hero" aria-label="Ask Compass">
    <div class="hero-art" aria-hidden="true"><span class="orbit one"></span><span class="orbit two"></span><span class="orbit three"></span><span class="orbit four"></span><span class="orbit axis"></span><span class="star s1">✦</span><span class="star s2">✧</span><span class="star s3">✦</span><span class="star s4">✦</span><span class="star s5">✧</span><span class="hero-compass"><span></span></span></div>
    <div class="hero-content"><span class="hero-icon">${icon("sparkles",18)} Campus assistant</span>
      <h2>What can I help you<br class="desktop-break"> find today?</h2>
      <p>Ask about campus services, your Student Pass or upcoming deadlines.</p>
      <form class="hero-form" data-form="question"><label class="sr" for="hero-question">Ask a campus question</label><input id="hero-question" name="question" required maxlength="500" placeholder="Ask a campus question…"><button type="submit" aria-label="Ask Compass">${icon("arrow",21)}</button></form>
    </div>
  </section>
  <section class="quick-section">${section("Quick access")}<div class="quick-grid">
    ${quickCard("Campus directory","Find offices and support","directory","pin","blue")}
    ${quickCard("Student Pass","Plan your renewal","pass","passport","lavender")}
    ${quickCard("Coursework","Track your deadlines","coursework","graduation","mint")}
  </div></section>
  <div class="today-grid">
    <section class="panel dashboard-panel">${section("Needs your attention","Updates and deadlines worth checking")}
      <div class="rows">
        ${row("mail","lavender",message.title,"Student Pass · Sample inbox","pass/inbox",message.status,message.status==="Action needed"?"sand":"lavender")}
        ${report?row("clipboard","blue",report.title,report.course+" · "+report.source,"coursework/"+encodeURIComponent(report.id),dueText(report),"lavender"):""}
        ${state.alerts.length?row("bell","mint","Coursework reminders",state.alerts.length+" in-app alert"+(state.alerts.length===1?"":"s"),"coursework","Scheduled","mint"):""}
      </div>
    </section>
    <section class="panel dashboard-panel">${section("Campus events","See what’s on and what’s next",go("View all","events"))}
      <div class="rows event-rows">${upcoming.length?upcoming.map(event=>`<a class="action-row" href="#events/${event.id}"><span class="date-tile"><b>${formatted(event.start,"day")}</b><small>${formatted(event.start,"month")}</small></span><div class="row-text"><strong>${event.title}</strong><span>${event.venue}</span></div>${eventPhase(event,state.clock)==="On now"?badge("On now","mint"):icon("chevron",16)}</a>`).join(""):blank("No upcoming demo events","Use the demo clock to return to the showcase date.","calendar")}</div>
    </section>
  </div>`;
}
function assistant() {
  return subtitle("Ask Compass","Find answers and take the next step with APU campus guidance.",state.chat.length?button("Clear chat","chat-clear","btn secondary","refresh"):"")+
  `<section class="panel chat-panel">
    <div class="chat-header">${tile("sparkles")}<div><strong>Campus assistant</strong><span>Cited campus guidance</span></div></div>
    <div class="chat-body" id="chat-body" aria-live="polite">
      ${state.chat.length?state.chat.map(item=>`<div class="bubble user">${escape(item.question)}</div><div class="chat-answer">${tile("sparkles","lavender",17)}<div class="bubble answer"><strong>${escape(item.answer.title)}</strong><p>${escape(item.answer.text)}</p>${go(item.answer.action[0],item.answer.action[1],"btn subtle")}${sourceList(item.answer.sources)}</div></div>`).join(""):`<div class="chat-welcome">${tile("compass","lavender",26)}<h2>How can I help?</h2><p>Ask about offices, Student Pass renewal, events or coursework.</p></div>`}
      ${busy&&draft?`<div class="bubble user">${escape(draft)}</div><div class="bubble answer pending">Looking up campus guidance…</div>`:""}
    </div>
    <div class="chat-footer"><div class="prompt-list">${prompts.map(value=>`<button class="pill" type="button" data-action="prompt" data-value="${escape(value)}" ${busy?"disabled":""}>${escape(value)}</button>`).join("")}</div>
      <form class="chat-form" data-form="question"><label class="sr" for="chat-question">Ask a campus question</label><input id="chat-question" name="question" maxlength="500" required placeholder="Type a campus question…" ${busy?"disabled":""}><button class="btn primary" type="submit" aria-label="Send question" ${busy?"disabled":""}>${icon("send",18)}</button></form>
    </div>
  </section>`;
}
function tabs(values,selected,action,label) {
  return `<div class="tabs" aria-label="${label}">${values.map(value=>`<button type="button" class="tab ${value===selected?"selected":""}" aria-pressed="${value===selected}" data-action="${action}" data-value="${escape(value)}">${escape(value)}</button>`).join("")}</div>`;
}
function officeCards() {
  const list=offices.filter(office=>(directoryFilter==="All"||directoryFilter===office.category)&&
    (office.name+" "+office.description+" "+office.location+" "+office.category).toLowerCase().includes(directoryQuery.toLowerCase().trim()));
  return list.length?list.map(office=>`<article class="panel office-card">${tile(office.icon,office.tone)}<div><span class="eyebrow">${office.category}</span><h2>${office.name}</h2><p>${office.description}</p></div><div class="meta-list"><span>${icon("pin",17)} ${office.location}</span><span>${icon("clock",17)} ${office.hours}</span></div>${go("Office details","directory/"+office.id,"text-link")}</article>`).join(""):blank("No matching campus services","Try a different search or category.","search");
}
function directory() {
  return subtitle("Campus directory","Find the right office, opening hours and support channel.")+
  `<div class="toolbar"><label class="search-box">${icon("search",19)}<input id="directory-search" type="search" aria-label="Search campus services" placeholder="Search offices or services" value="${escape(directoryQuery)}"></label>${tabs(["All","Student services","Academic","Technology","Finance"],directoryFilter,"directory-filter","Office categories")}</div>
  <div class="card-grid" id="office-results" aria-live="polite">${officeCards()}</div>`;
}
function officeDetail(office) {
  return go("Back to directory","directory","back-link","chevron")+
    subtitle(office.name,office.description,badge(office.category))+
    `<div class="content-grid"><section class="panel padded">${section("Location and contact")}<div class="detail-list"><div>${tile("pin","blue")}<span><b>Location</b><small>${office.location}</small></span></div><div>${tile("clock","lavender")}<span><b>Opening hours</b><small>${office.hours}</small></span></div>${office.contact?`<div>${tile("mail","mint")}<span><b>Email</b><small><a href="mailto:${office.contact}">${office.contact}</a></small></span></div>`:""}</div>${ext("Open official office source",office.source,"btn secondary")}</section>
    <section class="panel padded">${section("Getting there")}<p class="body-copy">${office.directions}</p><div class="notice">${icon("info",18)}<span>For step-free directions, confirm your route with campus support.</span></div>${ext("Virtual Help Centre",links.help)}${office.id==="immigration"?go("Open Student Pass planner","pass","btn subtle"):""}</section></div>`;
}
function passPage() {
  const {expiry,duration,checked}=state.pass;
  const plan=renewalPlan(expiry,duration,state.clock);
  const email=mail(), message=interpretMail(email);
  return subtitle("Student Pass","Plan your renewal, prepare documents and check your next action.",go("Immigration office","directory/immigration","btn secondary","pin"))+
  `<div class="pass-switch">${tabs(["Renewal planner","Sample inbox"],detail==="inbox"?"Sample inbox":"Renewal planner","pass-tab","Student Pass views")}</div>
  ${detail==="inbox"?`<div class="content-grid inbox-grid">
    <section class="panel padded">${section("Sample immigration inbox","Select a fictional email to extract its next action.")}<div class="sample-list">${samples.map(sample=>`<button type="button" data-action="select-mail" data-id="${sample.id}" class="sample-item ${sample.id===email.id?"selected":""}" aria-pressed="${sample.id===email.id}">${tile("mail","lavender",17)}<span><b>${sample.subject.split(" · ")[1]}</b><small>${at(sample.at)}</small></span>${icon("chevron",17)}</button>`).join("")}</div></section>
    <section class="panel padded mail-summary">${badge(message.status,message.status==="Action needed"?"sand":"mint")}<h2>${message.title}</h2><p>${message.summary}</p><div class="next-action"><span>${icon("arrow",19)}</span><div><b>Next action</b><p>${message.next}</p></div></div><div class="email-meta">${email.sender} · ${at(email.at)}</div><div class="button-row">${button("View original sample","mail-original","btn primary","mail")}${ext("Track in APSpace",links.apspace,"btn secondary")}${ext("EMGS tracker",links.emgs,"btn secondary")}</div></section>
  </div>`:`<div class="content-grid pass-grid">
    <section class="panel padded">${section("Renewal plan","Calculate your suggested start and published fee tier.")}
      <form class="plan-form" data-form="pass"><label>Student Pass expiry<input name="expiry" type="date" min="1900-01-01" max="2099-12-31" required value="${expiry}"></label>
        <label>Renewal length<select name="duration">${Array.from({length:10},(_,i)=>i+3).map(month=>`<option value="${month}" ${month===duration?"selected":""}>${month} months</option>`).join("")}</select></label><button type="submit" class="btn primary">Update plan</button></form>
      <div class="metric-grid"><div><small>Suggested start</small><strong>${formatted(plan.start)}</strong><span>About three months before expiry</span></div><div><small>Published fee tier</small><strong>${plan.fee?"RM "+plan.fee.toLocaleString("en-MY"):"Contact Immigration"}</strong><span>${plan.tier?"Based on the demo date · "+plan.tier:plan.remaining<0?"The selected pass has expired":"Fewer than six weeks to expiry"}</span></div></div>
      <div class="notice">${icon("info",18)}<span>Confirm your fee and required documents with APU before paying or submitting.</span></div>${sourceList([["APU renewal instructions and fee table",links.renewal],["APU Student Pass guidance",links.visa]])}
    </section>
    <section class="panel padded renewal-update">${tile("mail","lavender")}<h2>Latest sample email</h2>${badge(message.status,message.status==="Action needed"?"sand":"mint")}<h3>${message.title}</h3><p>${message.summary}</p>${go("Open sample inbox","pass/inbox","btn secondary")}</section>
  </div>
  <section class="panel padded checklist">${section("Document checklist",checked.length+" of "+checklist.length+" steps complete")}
    <progress max="${checklist.length}" value="${checked.length}" aria-label="Document checklist progress"></progress>
    <div class="checklist-grid">${checklist.map(([id,title,desc])=>`<label class="check-item"><input type="checkbox" data-action="check" data-id="${id}" ${checked.includes(id)?"checked":""}><span><b>${title}</b><small>${desc}</small></span></label>`).join("")}</div>
  </section>`}`;
}
const sampleCalendarUrl=new URL("./sample-moodle.ics",location.href);
window.addEventListener("hashchange",route);
try{
  const local=localStorage.getItem(key);
  if(local){
    const saved=JSON.parse(local);
    if(saved?.pass&&Array.isArray(saved.tasks)) state=saved;
  }
}catch{}
route();
const connectApi=(async()=>{
  if(location.protocol==="file:") return;
  try{
    const response=await fetch("./api/state",{signal:AbortSignal.timeout(1400),headers:{Accept:"application/json"}});
    if(response.ok&&response.headers.get("content-type")?.includes("application/json")){
      const data=await response.json();
      if(data?.pass&&Array.isArray(data.tasks)){state=data;api=true;if(!busy)render();}
    }
  }catch{}
})();
