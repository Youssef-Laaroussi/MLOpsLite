import { useId } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LineChart } from "lucide-react";

export function EmptyChart({ text }: { text: string }) {
  return <div className="empty-chart"><LineChart size={24} strokeWidth={1.2} /><p>{text}</p></div>;
}

export function TimelineChart({ data, dataKey, percent = false }: { data: Record<string, unknown>[]; dataKey: string; percent?: boolean }) {
  const id = useId().replace(/:/g, "");
  const values = data.map(item => Number(item[dataKey])).filter(Number.isFinite);
  const maximum = Math.max(...values, 0);
  const upper = percent ? Math.min(1, Math.max(.2, Math.ceil(maximum * 1.2 * 20) / 20)) : Math.max(1, maximum);
  const latest = values[values.length - 1];
  return <div className="timeline-plot">
    {percent && latest !== undefined && <span className="drift-current">Current: {latest.toFixed(2)}</span>}
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{top: 14, right: 8, left: -18, bottom: 0}}>
        <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#65bd88" stopOpacity={.3} /><stop offset="100%" stopColor="#a9dfb7" stopOpacity={.04} /></linearGradient></defs>
        <CartesianGrid vertical={false} stroke="#edf0f2" />
        <XAxis dataKey="date" tick={{fontSize: 10, fill: '#344158'}} tickLine={false} axisLine={{stroke: '#e2e8f0'}} minTickGap={18} tickFormatter={value => /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? new Date(`${value}T12:00:00Z`).toLocaleDateString('en-US', {month:'short',day:'numeric',timeZone:'UTC'}) : String(value)} />
        <YAxis tick={{fontSize: 10, fill: '#344158'}} tickLine={false} axisLine={false} allowDecimals={percent} tickFormatter={value => percent ? Number(value).toFixed(2) : value} domain={[0, upper]} />
        <Tooltip formatter={(value: number) => percent ? `${(value*100).toFixed(1)}% of features` : value} contentStyle={{borderRadius:10,fontSize:11,borderColor:'#e4e8ed'}} />
        <Area type="linear" dataKey={dataKey} name={percent ? 'Drift share' : 'Experiments'} stroke="#087c39" strokeWidth={2} fill={`url(#${id})`} dot={{r: 2.7, fill: 'white', strokeWidth: 1.7}} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  </div>;
}
