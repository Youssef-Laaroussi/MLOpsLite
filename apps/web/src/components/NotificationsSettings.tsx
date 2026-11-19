import { useEffect, useState, type ReactNode } from "react";
import { Bell, CheckCircle2, Clock, Eye, Mail, Send, Settings, Webhook } from "lucide-react";
import { useAuth } from "../context/AuthContext";

type Channel = "email" | "slack" | "webhook";
type EventKind = "experiments" | "deployments" | "monitoring" | "alerts" | "models" | "projects";
type Frequency = "realtime" | "daily" | "weekly";
type Preferences = { channels: Record<Channel,boolean>; events: Record<EventKind,boolean>; frequency: Frequency };
const defaults: Preferences = { channels:{email:true,slack:false,webhook:false}, events:{experiments:true,deployments:true,monitoring:true,alerts:true,models:false,projects:false}, frequency:"realtime" };
const events: readonly [EventKind,string,string][] = [
  ["experiments","Experiments","When an experiment finishes (success or failed)."],
  ["deployments","Deployments","When a deployment is created, updated, or fails."],
  ["monitoring","Monitoring & Drift","When data or model drift is detected."],
  ["alerts","Alerts","When a new alert is triggered."],
  ["models","Model Registry","When a model version is registered or promoted."],
  ["projects","Projects","When a project is created, updated, or shared."],
];
const frequencies: readonly [Frequency,string,string][] = [
  ["realtime","Real-time","Get notified immediately."],
  ["daily","Daily summary","Receive a single summary per day."],
  ["weekly","Weekly summary","Receive a summary of key events each week."],
];
function readPreferences(key:string):Preferences {
  const next:Preferences={channels:{...defaults.channels},events:{...defaults.events},frequency:defaults.frequency};
  try {
    const value=JSON.parse(localStorage.getItem(key)||"{}");
    for(const channel of Object.keys(next.channels) as Channel[]) if(typeof value?.channels?.[channel]==="boolean") next.channels[channel]=value.channels[channel];
    for(const event of Object.keys(next.events) as EventKind[]) if(typeof value?.events?.[event]==="boolean") next.events[event]=value.events[event];
    if(["realtime","daily","weekly"].includes(value?.frequency))next.frequency=value.frequency;
  }catch{/* Keep usable defaults when saved browser data is unavailable. */}
  return next;
}
function CardTitle({icon,title,description}:{icon:ReactNode;title:string;description:string}){return <header className="notifications-card-title">{icon}<div><h2>{title}</h2><p>{description}</p></div></header>;}
function previewFor(preferences:Preferences){
  if(!Object.values(preferences.channels).some(Boolean)||!Object.values(preferences.events).some(Boolean))return null;
  if(preferences.frequency!=="realtime")return {title:preferences.frequency==="daily"?"Daily Summary":"Weekly Summary",message:preferences.frequency==="daily"?"A summary of your selected MLOps events for the day.":"A summary of your selected MLOps events for the week."};
  const kind:EventKind = preferences.events.deployments?"deployments":events.find(([key])=>preferences.events[key])![0];
  const examples:Record<EventKind,{title:string;message:string}>={
    deployments:{title:"Deployment Successful",message:'Your model “demand-forecast-v2” was deployed successfully.'},
    experiments:{title:"Experiment Finished",message:'Your experiment “demand-forecast” finished successfully.'},
    monitoring:{title:"Drift Detected",message:"Data drift was detected for a monitored model."},
    alerts:{title:"New Alert",message:"A new alert requires your attention."},
    models:{title:"Model Registered",message:"A new model version was registered successfully."},
    projects:{title:"Project Updated",message:"Your project settings were updated successfully."},
  };
  return examples[kind];
}
export function NotificationsSettings(){
  const{user}=useAuth();const storageKey=`mlite_notifications_${user?.id??"guest"}`;
  const[preferences,setPreferences]=useState(()=>readPreferences(storageKey));const[error,setError]=useState("");const[saved,setSaved]=useState(false);
  useEffect(()=>{setPreferences(readPreferences(storageKey));setError("");setSaved(false);},[storageKey]);
  function persist(next:Preferences){
    try{localStorage.setItem(storageKey,JSON.stringify(next));setPreferences(next);setError("");setSaved(true);}
    catch{setError("Could not save notification preferences in this browser. Your previous choices are unchanged.");setSaved(false);}
  }
  const preview=previewFor(preferences);
  return <div className="settings-notifications">
    <p className="notifications-intro">Choose which events you want to be notified about and how you want to receive them.</p>
    <section className="notifications-banner"><div className="notifications-banner-icon"><Bell size={38}/></div><div className="notifications-banner-copy"><h2>Notifications</h2><p>Stay informed about your MLOps workflow, experiments, deployments, and system events.</p></div><div className="notifications-banner-art" aria-hidden="true"><svg viewBox="0 0 500 120" preserveAspectRatio="none"><path fill="#d4ffdd" d="M0 120Q90 20 180 65T350 35T500 0V120Z"/><path fill="#38f66b" d="M100 120Q220 25 290 65T500 15V120Z"/></svg><span><Bell size={30}/></span></div></section>
    <div className="notifications-columns">
      <section className="profile-card notifications-channels"><CardTitle icon={<Send/>} title="Notification Channels" description="How you want to receive notifications."/>
        {([
          ["email","Email","Receive important updates in your inbox.",<Mail size={25} aria-hidden="true"/>],
          ["slack","Slack","Get notifications in your Slack workspace.",<img src="/logos/slack.png" alt="Slack logo" width={26} height={26}/>],
          ["webhook","Webhook","Send events to your own endpoint (e.g., CI/CD, n8n).",<Webhook size={25} aria-hidden="true"/>],
        ] as const).map(([key,title,description,icon])=><div key={key} className="notifications-channel-row">{icon}<div><h3>{title}</h3><p>{description}</p></div><button type="button" role="switch" aria-label={`${title} notifications`} aria-checked={preferences.channels[key]} className="notifications-switch" onClick={()=>persist({...preferences,channels:{...preferences.channels,[key]:!preferences.channels[key]}})}><span/></button></div>)}
      </section>
      <section className="profile-card notifications-events"><CardTitle icon={<Settings/>} title="Notification Preferences" description="Select the events that should trigger a notification."/>
        <fieldset><legend className="notifications-sr-only">Event categories</legend>{events.map(([key,title,description])=><label key={key}><input type="checkbox" checked={preferences.events[key]} onChange={event=>persist({...preferences,events:{...preferences.events,[key]:event.target.checked}})}/><strong>{title}</strong><span>{description}</span></label>)}</fieldset>
      </section>
      <section className="profile-card notifications-frequency"><CardTitle icon={<Clock/>} title="Notification Frequency" description="Control how often you receive similar notifications."/>
        <fieldset><legend className="notifications-sr-only">Notification frequency</legend>{frequencies.map(([value,title,description])=><label key={value} data-selected={preferences.frequency===value}><input type="radio" name="notification-frequency" value={value} checked={preferences.frequency===value} onChange={()=>persist({...preferences,frequency:value})}/><div><strong>{title}</strong><p>{description}</p></div></label>)}</fieldset>
      </section>
      <section className="profile-card notifications-preview"><CardTitle icon={<Eye/>} title="Preview" description="Example of a notification you will receive."/>
        {preview?<div className="notifications-example" aria-label="Example notification"><div className="notifications-example-logo"><img src="/logo.png" alt="MLite" width={32} height={32}/></div><div className="notifications-example-copy"><h3>MLite · {preview.title}</h3><p>{preview.message}</p><span>Today, 11:02 AM</span></div><CheckCircle2 size={18} className="notifications-example-success" aria-hidden="true"/></div>:<div className="notifications-empty">Select a notification channel and an event category to preview a notification.</div>}
      </section>
    </div>
    <div className="notifications-feedback" aria-live="polite">{error?<p role="alert">{error}</p>:<p role={saved?"status":undefined}>{saved?"Preferences saved in this browser. ":""}These personal choices are not yet applied to server delivery. No notification is sent from this page.</p>}</div>
  </div>;
}
