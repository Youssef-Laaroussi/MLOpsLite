import React, { useEffect, useState } from "react";
import { FolderGit2, Plus, Calendar, GitBranch } from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
import { fetchProjects, createProject } from "../api/client";
import { Project } from "../api/types";

export const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");

  const loadProjects = async () => {
    try {
      const data = await fetchProjects();
      setProjects(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createProject({ name, slug: slug || name.toLowerCase().replace(/\s+/g, "-"), description });
      setShowModal(false);
      setName("");
      setSlug("");
      setDescription("");
      loadProjects();
    } catch (err) {
      alert("Failed to create project");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Workspaces & Projects</h2>
          <p className="text-sm text-slate-400">Organize experiments, model registries, and pipelines by project</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3BB48C] hover:bg-[#34A47F] text-[#071018] font-bold text-sm transition shadow-md shadow-[#3BB48C]/20"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          New Project
        </button>
      </div>

      {/* Grid of Projects */}
      {projects.length === 0 ? (
        <div className="text-center py-16 bg-[#0D1F2D] border border-[#19364C] rounded-xl shadow-lg">
          <FolderGit2 className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-200">No Projects Found</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
            Get started by initializing a project via CLI (`mlite init &lt;name&gt;`) or click below.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 px-4 py-2 bg-[#3BB48C] hover:bg-[#34A47F] text-[#071018] rounded-lg text-sm font-bold transition shadow-md shadow-[#3BB48C]/20"
          >
            Create First Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className="bg-[#0D1F2D] border border-[#19364C] rounded-xl p-5 flex flex-col justify-between hover:border-[#3BB48C]/40 transition shadow-md"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#071018] text-[#3BB48C] border border-[#19364C]">
                    {proj.slug}
                  </span>
                  <StatusBadge status={proj.status} />
                </div>
                <h3 className="text-base font-bold text-white mb-1">{proj.name}</h3>
                <p className="text-xs text-slate-400 line-clamp-2 mb-4">
                  {proj.description || "No description provided."}
                </p>
              </div>

              <div className="pt-3 border-t border-[#19364C] flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  {proj.created_at.slice(0, 10)}
                </span>
                {proj.git_url && (
                  <a
                    href={proj.git_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#3BB48C] hover:underline flex items-center gap-1 font-mono"
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                    Git
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0D1F2D] border border-[#19364C] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#3BB48C]"></span>
              Create New Project
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Fraud Detection"
                  className="w-full bg-[#071018] border border-[#19364C] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3BB48C] focus:ring-1 focus:ring-[#3BB48C]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Slug (optional)</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="fraud-detection"
                  className="w-full bg-[#071018] border border-[#19364C] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3BB48C] focus:ring-1 focus:ring-[#3BB48C]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-[#071018] border border-[#19364C] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3BB48C] focus:ring-1 focus:ring-[#3BB48C]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#071018] text-slate-300 text-sm hover:bg-[#112738] border border-[#19364C]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#3BB48C] hover:bg-[#34A47F] text-[#071018] text-sm font-bold shadow-md shadow-[#3BB48C]/20"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
