import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Loader2, RefreshCw, Search } from "lucide-react";
import { AppShell } from "@/components/wms/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/audit")({ component: AuditLogsPage });

function AuditLogsPage(){
 const [logs,setLogs]=useState<any[]>([]),[loading,setLoading]=useState(true),[query,setQuery]=useState("");
 const load=async()=>{setLoading(true);try{setLogs(await api.getAdminAuditLogs())}catch(e:any){toast.error(e.message||"Unable to load audit logs")}finally{setLoading(false)}};
 useEffect(()=>{void load()},[]);
 const filtered=useMemo(()=>{const q=query.trim().toLowerCase();return q?logs.filter(x=>[x.actor,x.action,x.target_name,x.target_type,JSON.stringify(x.details)].some(v=>String(v||"").toLowerCase().includes(q))):logs},[logs,query]);
 return <AppShell title="Audit Logs" subtitle="Administrative user and account activity." actions={<Button variant="outline" onClick={load} disabled={loading}><RefreshCw className={loading?"animate-spin":""}/> Refresh</Button>}>
  <Card className="overflow-hidden rounded-2xl"><CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><ClipboardList/> Activity history</CardTitle><div className="relative max-w-md"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><Input className="pl-9" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search actor, action or user..."/></div></CardHeader><CardContent className="overflow-x-auto p-0">
   {loading?<div className="flex h-48 items-center justify-center"><Loader2 className="animate-spin"/></div>:<table className="w-full min-w-[850px] text-left text-sm"><thead className="border-b bg-muted/50 text-xs"><tr>{["Date & time","Actor","Action","Target","Details"].map(h=><th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody>{filtered.map(log=><tr key={log.id} className="border-b"><td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{new Date(log.created_at).toLocaleString()}</td><td className="px-4 font-medium">{log.actor}</td><td className="px-4"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{String(log.action).replaceAll("_"," ")}</span></td><td className="px-4">{log.target_name||log.target_id||"—"}</td><td className="max-w-md px-4 py-3 text-xs text-muted-foreground">{Object.entries(log.details||{}).map(([k,v])=>`${k}: ${String(v)}`).join(" · ")||"—"}</td></tr>)}</tbody></table>}
   {!loading&&!filtered.length&&<p className="py-12 text-center text-muted-foreground">No audit activity found.</p>}
  </CardContent></Card>
 </AppShell>
}
