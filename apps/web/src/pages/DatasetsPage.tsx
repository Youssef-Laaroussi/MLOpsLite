import React, { useEffect, useState } from "react";
import { Database, Calendar } from "lucide-react";
import { fetchDatasets } from "../api/client";
import { Dataset } from "../api/types";

export const DatasetsPage: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchDatasets();
        setDatasets(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Datasets & Data Lineage</h2>
        <p className="text-sm text-slate-500">
          Track tabular training datasets with content-addressed SHA-256 deduplication and MinIO synchronization
        </p>
      </div>

      {/* Dataset Storage Growth (Native SVG Area Chart) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs hover:border-[#3BB48C]/30 transition-all">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-[#3BB48C]" />
            MinIO Storage Growth Trend
          </h3>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">30 Days</span>
        </div>
        
        <div className="relative h-44 w-full flex items-end justify-between px-2">
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6 border-b border-slate-200">
             <div className="w-full border-t border-slate-100 border-dashed h-0" />
             <div className="w-full border-t border-slate-100 border-dashed h-0" />
             <div className="w-full border-t border-slate-100 border-dashed h-0" />
          </div>
          
          {/* Native SVG Area Chart */}
          <div className="absolute inset-x-2 bottom-6 top-0 pointer-events-none">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3BB48C" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path 
                d="M 0 80 Q 15 75, 25 60 T 50 45 T 75 30 T 100 15 L 100 100 L 0 100 Z" 
                fill="url(#areaGradient)" 
              />
              <path 
                d="M 0 80 Q 15 75, 25 60 T 50 45 T 75 30 T 100 15" 
                fill="none" 
                stroke="#3BB48C" 
                strokeWidth="2.5" 
                strokeLinecap="round"
                className="drop-shadow-[0_4px_6px_rgba(59,180,140,0.4)]"
              />
              {/* Glowing Data Points */}
              {[
                { x: 0, y: 80, val: "1.2GB" }, 
                { x: 25, y: 60, val: "2.4GB" }, 
                { x: 50, y: 45, val: "4.8GB" }, 
                { x: 75, y: 30, val: "7.1GB" }, 
                { x: 100, y: 15, val: "12.5GB" }
              ].map((pt, i) => (
                <g key={i} className="group cursor-pointer pointer-events-auto">
                  <circle cx={pt.x} cy={pt.y} r="3" fill="#fff" stroke="#3BB48C" strokeWidth="1.5" className="group-hover:r-[5] transition-all" />
                  {/* Tooltip implementation inside SVG using foreignObject */}
                  <foreignObject x={pt.x - 30} y={pt.y - 35} width="60" height="30" className="opacity-0 group-hover:opacity-100 transition-opacity overflow-visible">
                    <div className="bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-md text-center shadow-lg">
                      {pt.val}
                    </div>
                  </foreignObject>
                </g>
              ))}
            </svg>
          </div>
          
          {/* X Axis Labels */}
          <div className="absolute bottom-0 inset-x-2 flex justify-between text-[10px] font-bold text-slate-400">
            <span>Week 1</span>
            <span>Week 2</span>
            <span>Week 3</span>
            <span>Week 4</span>
            <span>Now</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="bg-[#F8FAFC] border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Dataset Name</th>
              <th className="px-6 py-4">Format</th>
              <th className="px-6 py-4">Description</th>
              <th className="px-6 py-4">Registered Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {datasets.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                  No datasets registered yet. Track data files using CLI: `mlite data add ./train.csv`
                </td>
              </tr>
            ) : (
              datasets.map((d) => (
                <tr key={d.id} className="hover:bg-[#F0FDF9]/50 transition">
                  <td className="px-6 py-4 font-semibold text-slate-900 flex items-center gap-2">
                    <Database className="w-4 h-4 text-[#3BB48C]" />
                    {d.name}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#EBF8F4] text-xs font-mono text-[#1A7456] border border-[#BCE9DA] font-bold">
                      {d.format}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-xs">
                    {d.description || "No description provided"}
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {d.created_at.slice(0, 10)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
