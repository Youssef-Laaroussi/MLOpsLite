import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Box, Brush, Clock, Database, Ellipsis, FileText, FlaskConical, Layers, Link as LinkIcon, Plus, RefreshCw, Settings, Trash2, X } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

type Kind = "datasets" | "models" | "artifacts" | "other";
type Bucket = { name: string; kind: Kind; objects: number; size_bytes: number; complete: boolean; available: boolean };
type Snapshot = { storage_type: string; endpoint: string; default_bucket: string; connected: boolean; buckets: Bucket[]; categories: Record<Kind, number>; used_bytes: number; capacity_bytes: number | null; complete: boolean };
const categories = [["datasets",Database,"Datasets"],["models",Box,"Models"],["artifacts",FlaskConical,"Experiments (artifacts)"],["other",FileText,"Logs & Others"]] as const;
function bytes(value: number) { if(value===0)return "0 B";const unit=Math.min(4,Math.floor(Math.log(value)/Math.log(1024)));return `${(value/1024**unit).toLocaleString("en",{maximumFractionDigits:1})} ${["B","KB","MB","GB","TB"][unit]}`; }
function message(error: unknown, fallback: string) { const detail=(error as {response?:{data?:{detail?:unknown}}})?.response?.data?.detail;return typeof detail==="string"?detail:fallback; }
function StorageBucketIcon({size=24}:{size?:number}){return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16l-2 14H6L4 7ZM7 7V5a5 3 0 0 1 10 0v2M3 7h18"/></svg>;}
function CardTitle({icon,title,description,action}:{icon:ReactNode;title:string;description:string;action?:ReactNode}){return <header className="storage-card-title">{icon}<div><h2>{title}</h2><p>{description}</p></div>{action}</header>;}
function StorageDialog({bucket,onClose,onCreated}:{bucket:Bucket|null;onClose:()=>void;onCreated:()=>void}){
  const ref=useRef<HTMLDialogElement>(null);const titleId=useId();const[name,setName]=useState("");const[pending,setPending]=useState(false);const[error,setError]=useState("");
  useEffect(()=>{const dialog=ref.current;if(dialog&&!dialog.open)dialog.showModal();return()=>{if(dialog?.open)dialog.close();};},[]);
  async function create(event:FormEvent){event.preventDefault();if(pending)return;setPending(true);setError("");try{await api.post("/settings/storage/buckets",{name:name.trim()});onCreated();}catch(failure){setError(message(failure,"Could not create this bucket."));}finally{setPending(false);}}
  return <dialog ref={ref} className={`settings-storage-dialog${bucket ? "" : " creation-dialog"}`} aria-labelledby={titleId} onCancel={event=>{event.preventDefault();if(!pending)onClose();}}><header><h2 id={titleId}>{bucket?"Bucket Details":"Create Bucket"}</h2><button type="button" disabled={pending} aria-label="Close bucket dialog" onClick={onClose}><X size={18}/></button></header>
    {bucket?<dl><div><dt>Bucket</dt><dd>{bucket.name}</dd></div><div><dt>Type</dt><dd>{bucket.kind}</dd></div><div><dt>Objects measured</dt><dd>{bucket.objects.toLocaleString("en")}</dd></div><div><dt>Measured size</dt><dd>{bytes(bucket.size_bytes)}</dd></div><div><dt>Inventory</dt><dd>{bucket.complete?"Complete":"Partial or unavailable"}</dd></div></dl>:<form onSubmit={create}><label>Bucket name<input value={name} onChange={event=>setName(event.target.value)} required minLength={3} maxLength={63} pattern="[a-z0-9][a-z0-9.-]*[a-z0-9]" placeholder="e.g. mlite-artifacts" autoFocus disabled={pending}/></label><p>Use 3–63 lowercase letters, numbers, dots or hyphens. Creates an empty bucket on your configured storage server.</p>{error&&<p role="alert">{error}</p>}<footer><button type="button" disabled={pending} onClick={onClose}>Cancel</button><button type="submit" disabled={pending||!name.trim()}>{pending?"Creating…":"Create Bucket"}</button></footer></form>}
  </dialog>;
}
export function StorageSettings(){
  const{user}=useAuth();const isAdmin=user?.role==="ADMIN";
  const[dialog,setDialog]=useState<{bucket:Bucket|null}|null>(null);const[testing,setTesting]=useState(false);const[feedback,setFeedback]=useState("");const[testError,setTestError]=useState("");
  const inventory=useQuery({queryKey:["settings-storage",user?.id],queryFn:async({signal})=>(await api.get<Snapshot>("/settings/storage/",{signal,timeout:60000})).data,enabled:isAdmin,retry:false,staleTime:30000});
  const data=inventory.data;const total=data?.used_bytes??0;
  async function testConnection(){if(testing)return;setTesting(true);setFeedback("");setTestError("");try{await api.post("/settings/storage/test");setFeedback("Object storage connection verified.");void inventory.refetch();}catch(error){setTestError(message(error,"Could not connect to object storage."));}finally{setTesting(false);}}
  return <div className="settings-storage"><p className="storage-intro">Manage where your data, models, and artifacts are stored and set storage policies.</p>
    <section className="storage-banner"><div className="storage-banner-icon"><Database size={38}/></div><div className="storage-banner-copy"><h2>Storage</h2><p>Configure, monitor, and manage storage for datasets, models, and experiment artifacts.</p></div><div className="storage-banner-art" aria-hidden="true"><svg viewBox="0 0 500 120" preserveAspectRatio="none"><path fill="#e4fbea" d="M0 120Q90 20 180 65T350 35T500 0V120Z"/><path fill="#baf1cb" d="M100 120Q220 25 290 65T500 15V120Z"/></svg><span><img src="/logo.png" alt=""/></span></div></section>
    {!isAdmin&&<p className="storage-notice" role="status">Workspace storage details and bucket creation are available to administrators.</p>}
    {inventory.isError&&<p className="storage-error" role="alert">{message(inventory.error,"Could not load storage inventory.")}<button type="button" onClick={()=>void inventory.refetch()}>Retry</button></p>}
    <div className="storage-columns">
      <section className="profile-card storage-configuration"><CardTitle icon={<Database/>} title="Storage Configuration" description="Storage currently configured for your MLite workspace."/>
        <div className="storage-config-fields"><label>Storage Type<span className="storage-config-type"><span className="storage-input"><Database size={15}/><select disabled aria-label="Storage Type"><option>{data?.storage_type??"MinIO / S3 Compatible"}</option></select></span><span className="storage-badge" data-connected={Boolean(data?.connected)&&!inventory.isError&&!testError}>{!isAdmin?"Admin only":inventory.isPending?"Checking…":(inventory.isError||Boolean(testError))?"Unverified":data?.connected?"Connected":"Unverified"}</span></span></label>
          <label>Endpoint<span className="storage-input"><LinkIcon size={15}/><input aria-label="Endpoint" value={data?.endpoint??"—"} readOnly/></span></label>
          <label>Default Bucket<span className="storage-input"><StorageBucketIcon size={16}/><select disabled aria-label="Default Bucket"><option>{data?.default_bucket??"—"}</option></select></span></label>
        </div><p className="storage-small-note">Endpoint and default bucket are managed by the server.</p><div className="storage-feedback" aria-live="polite">{testError?<p role="alert">{testError}</p>:feedback?<p role="status">{feedback}</p>:null}</div><footer><button type="button" disabled={!isAdmin||testing} onClick={()=>void testConnection()}><Settings size={15}/>{testing?"Testing…":"Test Connection"}</button></footer>
      </section>
      <section className="profile-card storage-usage"><CardTitle icon={<Layers/>} title="Storage Usage" description="Measured object storage usage across your buckets." action={<button className="storage-refresh" type="button" aria-label="Refresh storage usage" disabled={!isAdmin||inventory.isFetching} onClick={()=>void inventory.refetch()}><RefreshCw size={16} className={inventory.isFetching?"animate-spin":undefined}/></button>}/>
        <div className="storage-total"><strong>{data?`${data.complete?"":"≥ "}${bytes(total)}`:"—"}</strong><span>Capacity not reported by S3</span></div>
        <div className="storage-distribution" role="img" aria-label="Measured storage usage by category">{categories.map(([key])=><span key={key} data-kind={key} style={{width:`${total?(data?.categories[key]??0)/total*100:0}%`}}/>)}</div>
        <dl className="storage-usage-list">{categories.map(([key,Icon,label])=><div key={key}><dt><Icon size={15}/>{label}</dt><dd>{data?bytes(data.categories[key]):"—"}</dd><span className="storage-badge">{data?`${total?Math.round(data.categories[key]/total*100):0}%`:"—"}</span></div>)}</dl>
        <p className="storage-small-note">Grouped by bucket names and object paths.{data&&!data.complete?" Partial inventory: displayed values are lower bounds.":""}</p>
      </section>
      <section className="profile-card storage-buckets"><CardTitle icon={<StorageBucketIcon/>} title="Buckets & Artifacts" description="Manage storage buckets and artifact organization."/>
        <div className="storage-table-scroll"><table><thead><tr><th>Bucket</th><th>Type</th><th>Objects</th><th>Size</th><th>Actions</th></tr></thead><tbody>{data?.buckets.map(bucket=><tr key={bucket.name}><td><StorageBucketIcon size={14}/><span title={bucket.name}>{bucket.name}</span></td><td><span className="storage-badge">{bucket.kind}</span></td><td>{bucket.available||bucket.objects?`${bucket.complete?"":"≥ "}${bucket.objects.toLocaleString("en")}`:"—"}</td><td>{bucket.available||bucket.size_bytes?`${bucket.complete?"":"≥ "}${bytes(bucket.size_bytes)}`:"—"}</td><td><button type="button" aria-label={`Details for ${bucket.name}`} onClick={()=>setDialog({bucket})}><Ellipsis size={16}/></button></td></tr>)}</tbody></table></div>
        {!data?.buckets.length&&<p className="storage-empty">{!isAdmin?"Administrator access required.":inventory.isPending?"Loading buckets…":inventory.isError?"Bucket inventory unavailable.":"No buckets found."}</p>}
        <footer><button type="button" disabled={!isAdmin} onClick={()=>setDialog({bucket:null})}><Plus size={16}/>Create Bucket</button></footer>
      </section>
      <section className="profile-card storage-retention"><CardTitle icon={<Brush/>} title="Retention & Cleanup" description="Storage lifecycle and retention policies."/>
        <div className="storage-retention-row"><Clock size={18}/><div><strong>Keep experiment artifacts</strong><p>Artifact retention is configured on the server.</p></div><button type="button" role="switch" aria-label="Keep experiment artifacts" aria-checked="false" disabled className="storage-toggle"><span/></button><select disabled aria-label="Experiment artifact retention"><option>Server managed</option></select></div>
        <div className="storage-retention-row"><Box size={18}/><div><strong>Keep model versions</strong><p>Model version policies are managed in the registry.</p></div><button type="button" role="switch" aria-label="Keep model versions" aria-checked="false" disabled className="storage-toggle"><span/></button><select disabled aria-label="Model version retention"><option>Server managed</option></select></div>
        <p className="storage-small-note">Automatic cleanup is not connected. No files are deleted from this page.</p><footer><button type="button" disabled title="Cleanup policies are not configured"><Trash2 size={15}/>Run Cleanup Now</button></footer>
      </section>
    </div>
    {dialog&&<StorageDialog bucket={dialog.bucket} onClose={()=>setDialog(null)} onCreated={()=>{setDialog(null);setFeedback("Bucket created.");void inventory.refetch();}}/>}
  </div>;
}
