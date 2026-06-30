import { useState } from "react";
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  X,
  GripVertical,
  Palette,
} from "lucide-react";
import type { Department } from "@/types";
import * as api from "@/api";
import { cn } from "@/lib/utils";

interface DepartmentManagerProps {
  departments: Department[];
  onRefresh: () => void;
}

const DEPT_COLORS = [
  "#5C3A1E",
  "#1E5C3A",
  "#3A1E5C",
  "#5C1E3A",
  "#1E3A5C",
  "#3A5C1E",
  "#C8A951",
  "#E74C3C",
  "#3498DB",
  "#2ECC71",
  "#9B59B6",
  "#F39C12",
];

export function DepartmentManager({ departments, onRefresh }: DepartmentManagerProps) {
  const [showEditor, setShowEditor] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleEdit = (dept: Department) => {
    setEditingDept(dept);
    setShowEditor(true);
  };

  const handleCreate = () => {
    setEditingDept(null);
    setShowEditor(true);
  };

  const handleDelete = async (id: string) => {
    await api.deleteDepartment(id);
    setDeletingId(null);
    onRefresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-sf-brown dark:text-slate-200 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-sf-gold" /> Departments
        </h4>
        <button
          onClick={handleCreate}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-sf-brown hover:bg-sf-brown-dark text-white rounded-lg transition-colors"
        >
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>

      <div className="space-y-1.5">
        {departments.map((dept) => (
          <div
            key={dept.id}
            className="flex items-center justify-between p-2.5 bg-sf-cream dark:bg-slate-700/50 rounded-lg border border-sf-cream-dark dark:border-slate-600 group hover:border-sf-gold/30 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: dept.color }}
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{dept.name}</p>
                <p className="text-[10px] text-slate-400 font-mono">{dept.slug}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleEdit(dept)}
                className="p-1 rounded text-slate-400 hover:text-sf-brown hover:bg-sf-cream-dark transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              {deletingId === dept.id ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDelete(dept.id)}
                    className="text-[10px] font-bold text-white bg-red-600 hover:bg-red-700 px-1.5 py-0.5 rounded"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setDeletingId(null)}
                    className="text-[10px] text-slate-400 hover:text-slate-600 px-1"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setDeletingId(dept.id)}
                  className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}

        {departments.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-4">
            No departments configured.
          </p>
        )}
      </div>

      {showEditor && (
        <DepartmentEditorModal
          department={editingDept}
          onClose={() => { setShowEditor(false); setEditingDept(null); }}
          onSave={async () => { setShowEditor(false); setEditingDept(null); onRefresh(); }}
        />
      )}
    </div>
  );
}

function DepartmentEditorModal({
  department,
  onClose,
  onSave,
}: {
  department: Department | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [name, setName] = useState(department?.name ?? "");
  const [color, setColor] = useState(department?.color ?? DEPT_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError("");

    if (department) {
      const ok = await api.updateDepartment(department.id, { name: name.trim(), color } as any);
      if (!ok) {
        setError("Failed to update department");
        setSaving(false);
        return;
      }
    } else {
      const result = await api.createDepartment(name.trim(), color);
      if (!result) {
        setError("Department already exists");
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm p-6 border border-sf-cream-dark dark:border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-sf-brown dark:text-slate-100 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-sf-gold" />
            {department ? "Edit Department" : "New Department"}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              className="w-full px-3 py-2 border border-sf-cream-dark dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-sm"
              placeholder="e.g. Human Resources"
              autoFocus
            />
            {error && <p className="text-red-500 text-[11px] mt-1 font-medium">{error}</p>}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Palette className="w-3 h-3" /> Color
            </label>
            <div className="flex flex-wrap gap-1.5">
              {DEPT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-7 h-7 rounded-lg border-2 transition-all",
                    color === c ? "border-sf-brown scale-110 ring-2 ring-sf-gold/30" : "border-transparent hover:scale-105"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-sf-cream-dark dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-xs font-mono"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-sf-cream-dark dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-500 font-medium hover:bg-sf-cream dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="px-4 py-2 text-sm bg-sf-brown hover:bg-sf-brown-dark text-white font-medium rounded-lg transition-colors shadow-xs disabled:opacity-50"
          >
            {saving ? "Saving..." : department ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
