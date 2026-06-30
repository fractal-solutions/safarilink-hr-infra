import { useState, useEffect, useRef, useCallback } from "react";
import {
  Megaphone,
  AlertTriangle,
  Clock,
  Info,
  Pin,
  Plus,
  Trash2,
  Pencil,
  Calendar,
  ChevronRight,
  ImagePlus,
  X,
  Bell,
  ExternalLink,
  LayoutDashboard,
  Smile,
  Grid2x2,
  Sparkles,
} from "lucide-react";
import type { Announcement, Banner, Department, PolicyDocument } from "@/types";
import * as api from "@/api";
import { cn } from "@/lib/utils";

interface BulletinBoardProps {
  isAdmin: boolean;
  departments: Department[];
  documents: PolicyDocument[];
  onSelectDepartment: (deptId: string) => void;
  onSelectDoc: (docId: string) => void;
}

const TYPE_CONFIG: Record<string, { icon: typeof Info; color: string; bg: string; border: string; label: string }> = {
  info: { icon: Info, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/30", border: "border-blue-200 dark:border-blue-800", label: "Information" },
  alert: { icon: AlertTriangle, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/30", border: "border-amber-200 dark:border-amber-800", label: "Alert" },
  warning: { icon: AlertTriangle, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/30", border: "border-red-200 dark:border-red-800", label: "Warning" },
  deadline: { icon: Clock, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/30", border: "border-purple-200 dark:border-purple-800", label: "Deadline" },
};

const GRID_SIZE_CLASSES: Record<string, string> = {
  small: "",
  medium: "",
  large: "sm:col-span-2 sm:row-span-2",
  wide: "sm:col-span-2",
  tall: "sm:row-span-2",
};

const PRESET_GRADIENTS = [
  "linear-gradient(135deg, #5C3A1E 0%, #C8A951 100%)",
  "linear-gradient(135deg, #1E3A5C 0%, #3498DB 100%)",
  "linear-gradient(135deg, #1E5C3A 0%, #2ECC71 100%)",
  "linear-gradient(135deg, #5C1E3A 0%, #E74C3C 100%)",
  "linear-gradient(135deg, #3A1E5C 0%, #9B59B6 100%)",
  "linear-gradient(135deg, #0F0F0F 0%, #434343 100%)",
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
];

const EMOJI_PRESETS = ["📢", "🚨", "⏰", "📋", "🎯", "⚡", "🔥", "💡", "📌", "🎉", "⚠️", "✅", "🏢", "📊", "🤝", "💼", "🗓️", "📧"];

export function BulletinBoard({ isAdmin, departments, documents, onSelectDepartment, onSelectDoc }: BulletinBoardProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAnnouncementEditor, setShowAnnouncementEditor] = useState(false);
  const [showBannerEditor, setShowBannerEditor] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropId, setDropId] = useState<string | null>(null);
  const dragCounter = useRef<number[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [anns, banrs] = await Promise.all([api.getAnnouncements(), api.getBanners()]);
    setAnnouncements(anns);
    setBanners(banrs);
    setLoading(false);
  };

  const handleDragStart = useCallback((id: string) => { setDragId(id); }, []);
  const handleDragEnd = useCallback(() => { setDragId(null); setDropId(null); dragCounter.current = []; }, []);
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }, []);
  const handleDragEnter = useCallback((id: string, e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current[id] = (dragCounter.current[id] || 0) + 1;
    if (dragId && id !== dragId) setDropId(id);
  }, [dragId]);
  const handleDragLeave = useCallback((id: string) => {
    dragCounter.current[id] = (dragCounter.current[id] || 0) - 1;
    if (dragCounter.current[id] <= 0) { dragCounter.current[id] = 0; if (dropId === id) setDropId(null); }
  }, [dropId]);

  const handleDrop = useCallback(async (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    setDragId(null);
    setDropId(null);
    dragCounter.current = [];

    const items = [...announcements];
    const fromIdx = items.findIndex((a) => a.id === dragId);
    const toIdx = items.findIndex((a) => a.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    const [moved] = items.splice(fromIdx, 1);
    items.splice(toIdx, 0, moved);
    setAnnouncements(items);

    const order = items.map((a, i) => ({ id: a.id, sort_order: i }));
    await api.reorderAnnouncements(order);
  }, [dragId, announcements]);

  const handleDeleteAnnouncement = async (id: string) => {
    await api.deleteAnnouncement(id);
    await loadData();
    setDeletingId(null);
  };

  const handleDeleteBanner = async (id: string) => {
    await api.deleteBanner(id);
    await loadData();
    setDeletingId(null);
  };

  const pinned = announcements.filter((a) => a.isPinned);
  const regular = announcements.filter((a) => !a.isPinned);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-sf-brown border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading bulletin board...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banners */}
      {banners.length > 0 && (
        <div className="space-y-3">
          {banners.map((banner) => (
            <div
              key={banner.id}
              className="rounded-2xl overflow-hidden shadow-lg relative group"
              style={{
                background: banner.gradient || banner.imageUrl ? undefined : banner.bgColor,
                color: banner.textColor,
              }}
            >
              {banner.imageUrl && (
                <div className="absolute inset-0">
                  <img src={banner.imageUrl} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0" style={{ background: banner.gradient || banner.bgColor, opacity: 0.7 }} />
                </div>
              )}
              {banner.gradient && !banner.imageUrl && (
                <div className="absolute inset-0" style={{ background: banner.gradient }} />
              )}
              <div className="relative px-8 py-7 flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{banner.title}</h3>
                  {banner.subtitle && <p className="text-sm opacity-90 mt-1">{banner.subtitle}</p>}
                </div>
                {banner.linkUrl && (
                  <a href={banner.linkUrl} target="_blank" rel="noopener noreferrer" className="ml-4 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-medium transition-colors flex items-center gap-1.5 shrink-0">
                    Learn More <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {isAdmin && (
                  <div className="absolute top-3 right-3 hidden group-hover:flex items-center gap-1">
                    <button onClick={() => { setEditingBanner(banner); setShowBannerEditor(true); }} className="p-1.5 rounded-md bg-black/30 hover:bg-black/50 text-white/80 hover:text-white transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeletingId(banner.id)} className="p-1.5 rounded-md bg-black/30 hover:bg-red-600 text-white/80 hover:text-white transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>
              {deletingId === banner.id && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-2xl">
                  <div className="bg-white rounded-xl p-5 shadow-xl text-slate-900 text-center">
                    <p className="text-sm font-medium mb-3">Delete this banner?</p>
                    <div className="flex gap-2 justify-center">
                      <button onClick={() => handleDeleteBanner(banner.id)} className="px-4 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg">Delete</button>
                      <button onClick={() => setDeletingId(null)} className="px-4 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Admin Quick Actions */}
      {isAdmin && (
        <div className="flex items-center gap-2">
          <button onClick={() => { setEditingAnnouncement(null); setShowAnnouncementEditor(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-sf-brown hover:bg-sf-brown-dark text-white rounded-xl text-sm font-medium transition-colors shadow-xs">
            <Plus className="w-4 h-4" /> New Announcement
          </button>
          <button onClick={() => { setEditingBanner(null); setShowBannerEditor(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-sf-cream-dark dark:border-slate-700 hover:bg-sf-cream dark:hover:bg-slate-700 text-sf-brown dark:text-slate-300 rounded-xl text-sm font-medium transition-colors">
            <ImagePlus className="w-4 h-4" /> New Banner
          </button>
        </div>
      )}

      {/* Pinned */}
      {pinned.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Pin className="w-4 h-4 text-sf-gold" />
            <h3 className="text-sm font-bold text-sf-brown dark:text-slate-200 uppercase tracking-wider">Pinned</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 auto-rows-auto">
            {pinned.map((ann) => (
              <BentoCard key={ann.id} announcement={ann} isAdmin={isAdmin} onEdit={() => { setEditingAnnouncement(ann); setShowAnnouncementEditor(true); }} onDelete={() => handleDeleteAnnouncement(ann.id)} deleting={deletingId === ann.id} onCancelDelete={() => setDeletingId(null)}
                isDragging={dragId === ann.id} isDropTarget={dropId === ann.id}
                onDragStart={() => handleDragStart(ann.id)} onDragEnd={handleDragEnd} onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(ann.id, e)} onDragLeave={() => handleDragLeave(ann.id)} onDrop={() => handleDrop(ann.id)} />
            ))}
          </div>
        </div>
      )}

      {/* All announcements — bento grid */}
      {regular.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-bold text-sf-brown dark:text-slate-200 uppercase tracking-wider">Announcements</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 auto-rows-auto">
            {regular.map((ann) => (
              <BentoCard key={ann.id} announcement={ann} isAdmin={isAdmin} onEdit={() => { setEditingAnnouncement(ann); setShowAnnouncementEditor(true); }} onDelete={() => handleDeleteAnnouncement(ann.id)} deleting={deletingId === ann.id} onCancelDelete={() => setDeletingId(null)}
                isDragging={dragId === ann.id} isDropTarget={dropId === ann.id}
                onDragStart={() => handleDragStart(ann.id)} onDragEnd={handleDragEnd} onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(ann.id, e)} onDragLeave={() => handleDragLeave(ann.id)} onDrop={() => handleDrop(ann.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Department Quick Access */}
      {departments.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <LayoutDashboard className="w-4 h-4 text-sf-gold" />
            <h3 className="text-sm font-bold text-sf-brown dark:text-slate-200 uppercase tracking-wider">Department Manuals</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {departments.map((dept) => {
              const deptDocs = documents.filter((d) => d.departmentId === dept.id);
              return (
                <button key={dept.id} onClick={() => onSelectDepartment(dept.id)} className="text-left p-4 bg-white dark:bg-slate-800 rounded-xl border border-sf-cream-dark dark:border-slate-700 hover:border-sf-gold/40 dark:hover:border-sf-gold/30 hover:shadow-md transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ backgroundColor: dept.color }}>{dept.name.charAt(0)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{dept.name}</p>
                      <p className="text-[11px] text-slate-400">{deptDocs.length} manual{deptDocs.length !== 1 ? "s" : ""}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 group-hover:text-sf-gold transition-colors" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {announcements.length === 0 && banners.length === 0 && (
        <div className="text-center py-16">
          <Megaphone className="w-16 h-16 mx-auto mb-4 text-slate-200 dark:text-slate-700" />
          <h3 className="text-lg font-bold text-slate-400 dark:text-slate-500 mb-1">Bulletin Board is Empty</h3>
          <p className="text-sm text-slate-300 dark:text-slate-600">{isAdmin ? "Create announcements and banners to keep staff informed." : "No announcements at this time."}</p>
        </div>
      )}

      {showAnnouncementEditor && (
        <AnnouncementEditorModal announcement={editingAnnouncement} departments={departments} onClose={() => { setShowAnnouncementEditor(false); setEditingAnnouncement(null); }} onSave={async () => { setShowAnnouncementEditor(false); setEditingAnnouncement(null); await loadData(); }} />
      )}
      {showBannerEditor && (
        <BannerEditorModal banner={editingBanner} onClose={() => { setShowBannerEditor(false); setEditingBanner(null); }} onSave={async () => { setShowBannerEditor(false); setEditingBanner(null); await loadData(); }} />
      )}
    </div>
  );
}

function BentoCard({ announcement: ann, isAdmin, onEdit, onDelete, deleting, onCancelDelete, isDragging, isDropTarget, onDragStart, onDragEnd, onDragOver, onDragEnter, onDragLeave, onDrop }: {
  announcement: Announcement; isAdmin: boolean; onEdit: () => void; onDelete: () => void; deleting: boolean; onCancelDelete: () => void;
  isDragging?: boolean; isDropTarget?: boolean;
  onDragStart?: () => void; onDragEnd?: () => void; onDragOver?: (e: React.DragEvent) => void;
  onDragEnter?: (e: React.DragEvent) => void; onDragLeave?: () => void; onDrop?: () => void;
}) {
  const config = TYPE_CONFIG[ann.type] || TYPE_CONFIG.info;
  const Icon = config.icon;
  const gridSize = ann.gridSize || "medium";
  const isLarge = gridSize === "large" || gridSize === "tall";
  const hasImage = !!ann.imageUrl;

  return (
    <div
      draggable={isAdmin}
      onDragStart={() => onDragStart?.()}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn("rounded-xl border overflow-hidden transition-all relative group flex flex-col", config.border, GRID_SIZE_CLASSES[gridSize], isDragging && "opacity-40 scale-95", isDropTarget && "ring-2 ring-sf-gold/50 border-sf-gold border-dashed bg-sf-cream/30")}
    >
      {/* Image */}
      {hasImage && (
        <div className={cn("w-full overflow-hidden", isLarge ? "h-48" : "h-28")}>
          <img src={ann.imageUrl!} alt={ann.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className={cn("flex-1 p-4", !hasImage && config.bg)}>
        <div className="flex items-start gap-3">
          {ann.emoji && !hasImage && (
            <span className="text-2xl shrink-0 leading-none">{ann.emoji}</span>
          )}
          {!hasImage && !ann.emoji && (
            <div className={cn("p-2 rounded-lg shrink-0", config.bg)}>
              <Icon className={cn("w-4 h-4", config.color)} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h4 className={cn("font-bold text-slate-900 dark:text-slate-100", isLarge ? "text-lg" : "text-sm")}>{ann.title}</h4>
              {ann.isPinned && <Pin className="w-3 h-3 text-sf-gold shrink-0" />}
              <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", config.bg, config.color)}>{config.label}</span>
            </div>
            {ann.content && (
              <p className={cn("text-slate-600 dark:text-slate-400 leading-relaxed", isLarge ? "text-sm" : "text-xs", isLarge ? "" : "line-clamp-3")}>{ann.content}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400 flex-wrap">
              {ann.departmentName && (
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: ann.departmentColor || "#999" }} />{ann.departmentName}</span>
              )}
              {ann.authorName && <span>By {ann.authorName}</span>}
              <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
              {ann.expiresAt && <span className="text-amber-500">Expires {new Date(ann.expiresAt).toLocaleDateString()}</span>}
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-1 shrink-0 hidden group-hover:flex">
              <button onClick={onEdit} className="p-1.5 rounded-md text-slate-400 hover:text-sf-brown hover:bg-white/50 dark:hover:bg-slate-700 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={onDelete} className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          )}
        </div>
      </div>

      {deleting && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-xl">
          <div className="bg-white rounded-xl p-5 shadow-xl text-slate-900 text-center">
            <p className="text-sm font-medium mb-3">Delete this announcement?</p>
            <div className="flex gap-2 justify-center">
              <button onClick={onDelete} className="px-4 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg">Delete</button>
              <button onClick={onCancelDelete} className="px-4 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AnnouncementEditorModal({ announcement, departments, onClose, onSave }: {
  announcement: Announcement | null; departments: Department[]; onClose: () => void; onSave: () => void;
}) {
  const [title, setTitle] = useState(announcement?.title ?? "");
  const [content, setContent] = useState(announcement?.content ?? "");
  const [type, setType] = useState(announcement?.type ?? "info");
  const [departmentId, setDepartmentId] = useState(announcement?.departmentId ?? "");
  const [priority, setPriority] = useState(announcement?.priority ?? 0);
  const [isPinned, setIsPinned] = useState(announcement?.isPinned ?? false);
  const [imageUrl, setImageUrl] = useState(announcement?.imageUrl ?? "");
  const [emoji, setEmoji] = useState(announcement?.emoji ?? "");
  const [gridSize, setGridSize] = useState(announcement?.gridSize ?? "medium");
  const [expiresAt, setExpiresAt] = useState(announcement?.expiresAt?.slice(0, 10) ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const data = {
      title: title.trim(), content, type, departmentId: departmentId || null,
      priority, isPinned, imageUrl: imageUrl || null, emoji: emoji || null,
      gridSize, expiresAt: expiresAt || null,
    };
    if (announcement) { await api.updateAnnouncement(announcement.id, data as any); }
    else { await api.createAnnouncement(data); }
    setSaving(false); onSave();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 border border-sf-cream-dark dark:border-slate-700 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-sf-brown dark:text-slate-100 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-sf-gold" /> {announcement ? "Edit Announcement" : "New Announcement"}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border border-sf-cream-dark dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-sm" placeholder="Announcement title" autoFocus />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Content</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3} className="w-full px-3 py-2 border border-sf-cream-dark dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-sm resize-none" placeholder="Details..." />
          </div>

          {/* Emoji picker */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Smile className="w-3 h-3" /> Emoji</label>
            <div className="flex flex-wrap gap-1.5">
              {EMOJI_PRESETS.map((e) => (
                <button key={e} onClick={() => setEmoji(emoji === e ? "" : e)} className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-all border-2", emoji === e ? "border-sf-gold bg-sf-cream scale-110" : "border-transparent hover:bg-sf-cream/50")}>{e}</button>
              ))}
            </div>
          </div>

          {/* Image URL */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><ImagePlus className="w-3 h-3" /> Image URL (optional)</label>
            <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="w-full px-3 py-2 border border-sf-cream-dark dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-sm" placeholder="https://example.com/image.jpg" />
            {imageUrl && (
              <div className="mt-2 rounded-lg overflow-hidden h-24 border border-sf-cream-dark dark:border-slate-600">
                <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-3 py-2 border border-sf-cream-dark dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-sm">
                <option value="info">Information</option>
                <option value="alert">Alert</option>
                <option value="warning">Warning</option>
                <option value="deadline">Deadline</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Grid2x2 className="w-3 h-3" /> Grid Size</label>
              <select value={gridSize} onChange={(e) => setGridSize(e.target.value)} className="w-full px-3 py-2 border border-sf-cream-dark dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-sm">
                <option value="small">Small (1x1)</option>
                <option value="medium">Medium (1x1)</option>
                <option value="wide">Wide (2x1)</option>
                <option value="tall">Tall (1x2)</option>
                <option value="large">Large (2x2)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Department</label>
              <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="w-full px-3 py-2 border border-sf-cream-dark dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-sm">
                <option value="">All Departments</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Expires On</label>
              <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="w-full px-3 py-2 border border-sf-cream-dark dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Priority</label>
              <select value={priority} onChange={(e) => setPriority(Number(e.target.value))} className="w-full px-3 py-2 border border-sf-cream-dark dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-sm">
                <option value={0}>Normal</option>
                <option value={1}>High</option>
                <option value={2}>Urgent</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer pb-2">
                <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-sf-brown focus:ring-sf-gold" />
                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">Pin to top</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-sf-cream-dark dark:border-slate-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 font-medium hover:bg-sf-cream dark:hover:bg-slate-700 rounded-lg transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={!title.trim() || saving} className="px-4 py-2 text-sm bg-sf-brown hover:bg-sf-brown-dark text-white font-medium rounded-lg transition-colors shadow-xs disabled:opacity-50">{saving ? "Saving..." : announcement ? "Update" : "Create"}</button>
        </div>
      </div>
    </div>
  );
}

function BannerEditorModal({ banner, onClose, onSave }: { banner: Banner | null; onClose: () => void; onSave: () => void }) {
  const [title, setTitle] = useState(banner?.title ?? "");
  const [subtitle, setSubtitle] = useState(banner?.subtitle ?? "");
  const [bgColor, setBgColor] = useState(banner?.bgColor ?? "#5C3A1E");
  const [textColor, setTextColor] = useState(banner?.textColor ?? "#FFFFFF");
  const [gradient, setGradient] = useState(banner?.gradient ?? "");
  const [imageUrl, setImageUrl] = useState(banner?.imageUrl ?? "");
  const [linkUrl, setLinkUrl] = useState(banner?.linkUrl ?? "");
  const [saving, setSaving] = useState(false);

  const previewStyle: React.CSSProperties = {
    color: textColor,
    ...(gradient ? { background: gradient } : imageUrl ? {} : { backgroundColor: bgColor }),
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await api.createBanner({ title: title.trim(), subtitle, bgColor, textColor, gradient: gradient || undefined, imageUrl: imageUrl || undefined, linkUrl: linkUrl || undefined });
    if (banner) { await api.updateBanner(banner.id, { title: title.trim(), subtitle, bgColor, textColor, gradient: gradient || null, imageUrl: imageUrl || null, linkUrl: linkUrl || null } as any); }
    setSaving(false); onSave();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 border border-sf-cream-dark dark:border-slate-700 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-sf-brown dark:text-slate-100 flex items-center gap-2">
            <ImagePlus className="w-5 h-5 text-sf-gold" /> {banner ? "Edit Banner" : "New Banner"}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        {/* Live Preview */}
        <div className="rounded-xl mb-4 overflow-hidden shadow-inner relative" style={previewStyle}>
          {imageUrl && (
            <div className="absolute inset-0">
              <img src={imageUrl} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: gradient || bgColor, opacity: gradient ? 0.6 : 0.7 }} />
            </div>
          )}
          <div className="relative px-6 py-5">
            <p className="text-lg font-bold">{title || "Banner Title"}</p>
            {subtitle && <p className="text-sm opacity-90">{subtitle}</p>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border border-sf-cream-dark dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-sm" placeholder="Banner title" autoFocus />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Subtitle</label>
            <input type="text" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="w-full px-3 py-2 border border-sf-cream-dark dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-sm" placeholder="Optional subtitle" />
          </div>

          {/* Background Image */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><ImagePlus className="w-3 h-3" /> Background Image URL</label>
            <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="w-full px-3 py-2 border border-sf-cream-dark dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-sm" placeholder="https://example.com/image.jpg" />
          </div>

          {/* Gradient Presets */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Gradient</label>
            <div className="grid grid-cols-6 gap-1.5 mb-2">
              {PRESET_GRADIENTS.map((g) => (
                <button key={g} onClick={() => setGradient(gradient === g ? "" : g)} className={cn("w-full h-8 rounded-lg border-2 transition-all", gradient === g ? "border-white ring-2 ring-sf-gold scale-105" : "border-transparent hover:scale-105")} style={{ background: g }} />
              ))}
            </div>
            <input type="text" value={gradient} onChange={(e) => setGradient(e.target.value)} className="w-full px-3 py-1.5 border border-sf-cream-dark dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-xs font-mono" placeholder="linear-gradient(135deg, #000 0%, #fff 100%)" />
          </div>

          {/* Solid Color */}
          {!gradient && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Background Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                  <input type="text" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="flex-1 px-3 py-1.5 border border-sf-cream-dark dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-xs font-mono" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Text Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                  <input type="text" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="flex-1 px-3 py-1.5 border border-sf-cream-dark dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-xs font-mono" />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Link URL (optional)</label>
            <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="w-full px-3 py-2 border border-sf-cream-dark dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-sm" placeholder="https://..." />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-sf-cream-dark dark:border-slate-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 font-medium hover:bg-sf-cream dark:hover:bg-slate-700 rounded-lg transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={!title.trim() || saving} className="px-4 py-2 text-sm bg-sf-brown hover:bg-sf-brown-dark text-white font-medium rounded-lg transition-colors shadow-xs disabled:opacity-50">{saving ? "Saving..." : banner ? "Update" : "Create"}</button>
        </div>
      </div>
    </div>
  );
}
