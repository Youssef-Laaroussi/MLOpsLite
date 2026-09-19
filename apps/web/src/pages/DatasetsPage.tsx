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
        <h2 className="text-xl font-bold text-white tracking-tight">Datasets & Data Lineage</h2>
        <p className="text-sm text-slate-400">
          Track tabular training datasets with content-addressed SHA-256 deduplication and MinIO synchronization
        </p>
      </div>

      <div className="bg-[#0D1F2D] border border-[#19364C] rounded-xl overflow-hidden shadow-lg">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-[#071018] border-b border-[#19364C] text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Dataset Name</th>
              <th className="px-6 py-4">Format</th>
              <th className="px-6 py-4">Description</th>
              <th className="px-6 py-4">Registered Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#19364C]">
            {datasets.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                  No datasets registered yet. Track data files using CLI: `mlite data add ./train.csv`
                </td>
              </tr>
            ) : (
              datasets.map((d) => (
                <tr key={d.id} className="hover:bg-[#112738] transition">
                  <td className="px-6 py-4 font-medium text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-[#3BB48C]" />
                    {d.name}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded bg-[#071018] text-xs font-mono text-[#3BB48C] border border-[#19364C]">
                      {d.format}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-xs">
                    {d.description || "No description provided"}
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-xs flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
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
