import React, { useEffect, useState } from "react";
import { Database, FileCode, HardDrive, Calendar } from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
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
        <h2 className="text-xl font-bold text-white tracking-tight">Datasets & Data Lineage</h2>
        <p className="text-sm text-slate-400">
          Track tabular training datasets with content-addressed SHA-256 deduplication and MinIO synchronization
        </p>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950/80 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Dataset Name</th>
              <th className="px-6 py-4">Format</th>
              <th className="px-6 py-4">Description</th>
              <th className="px-6 py-4">Registered Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {datasets.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                  No datasets registered yet. Track data files using CLI: `mlite data add ./train.csv`
                </td>
              </tr>
            ) : (
              datasets.map((d) => (
                <tr key={d.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-6 py-4 font-medium text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-sky-400" />
                    {d.name}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-xs font-mono text-slate-300">
                      {d.format}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-xs">
                    {d.description || "No description provided"}
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
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
