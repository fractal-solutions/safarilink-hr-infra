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
  Send,
  Upload,
  LinkIcon,
  ThumbsUp,
  MessageCircle,
  Eye,
  Reply,
} from "lucide-react";
import type { Announcement, Banner, Department, PolicyDocument, AnnouncementDetail, AnnouncementThread } from "@/types";
import * as api from "@/api";
import { cn } from "@/lib/utils";

interface BulletinBoardProps {
  isAdmin: boolean;
  activeUserId: string;
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
  wide: "sm:col-span-2",
  tall: "sm:row-span-2",
  large: "sm:col-span-2 sm:row-span-2",
  xlarge: "sm:col-span-3 sm:row-span-2",
  "tall-3": "sm:row-span-3",
  "tallwide": "sm:col-span-2 sm:row-span-3",
  "tall-4": "sm:row-span-4",
  hero: "sm:col-span-3",
  "hero-3": "sm:col-span-3 sm:row-span-3",
  "hero-4": "sm:col-span-3 sm:row-span-4",
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

interface GridPreset {
  value: string;
  label: string;
  cols: number;
  rows: number;
}

const GRID_PRESETS: GridPreset[] = [
  { value: "small", label: "Small", cols: 1, rows: 1 },
  { value: "medium", label: "Medium", cols: 1, rows: 1 },
  { value: "wide", label: "Wide", cols: 2, rows: 1 },
  { value: "tall", label: "Tall", cols: 1, rows: 2 },
  { value: "hero", label: "Hero", cols: 3, rows: 1 },
  { value: "large", label: "Large", cols: 2, rows: 2 },
  { value: "xlarge", label: "X-Large", cols: 3, rows: 2 },
  { value: "tall-3", label: "Tall 3", cols: 1, rows: 3 },
  { value: "tallwide", label: "Tall Wide", cols: 2, rows: 3 },
  { value: "tall-4", label: "Tall 4", cols: 1, rows: 4 },
  { value: "hero-3", label: "Hero 3", cols: 3, rows: 3 },
  { value: "hero-4", label: "Hero 4", cols: 3, rows: 4 },
];

function MiniMosaic({ cols, rows }: { cols: number; rows: number }) {
  return (
    <div className="w-[57px] h-[44px] grid grid-cols-3 grid-rows-4 gap-[2px] p-[2px] rounded-md bg-slate-100 dark:bg-slate-700/40">
      {Array.from({ length: 12 }).map((_, i) => {
        const r = Math.floor(i / 3);
        const c = i % 3;
        const active = c < cols && r < rows;
        return (
          <span
            key={i}
            className={cn(
              "rounded-[1.5px] transition-colors",
              active ? "bg-sf-gold shadow-[0_0_4px_rgba(200,169,81,0.5)]" : "bg-slate-200/80 dark:bg-slate-600/60"
            )}
          />
        );
      })}
    </div>
  );
}

function GridSizePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="rounded-xl border border-sf-cream-dark dark:border-slate-600 bg-sf-cream/50 dark:bg-slate-900/40 p-2.5">
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
        {GRID_PRESETS.map((p) => {
          const active = value === p.value;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => onChange(p.value)}
              className={cn(
                "flex flex-col items-center gap-1 px-1 py-2 rounded-lg border transition-all",
                active
                  ? "border-sf-gold bg-sf-gold/10 dark:bg-sf-gold/10 ring-1 ring-sf-gold/40"
                  : "border-transparent hover:border-sf-cream-dark dark:hover:border-slate-600 hover:bg-white dark:hover:bg-slate-800"
              )}
            >
              <MiniMosaic cols={p.cols} rows={p.rows} />
              <span className={cn("text-[10px] font-bold leading-none", active ? "text-sf-brown dark:text-sf-gold" : "text-slate-600 dark:text-slate-300")}>
                {p.label}
              </span>
              <span className={cn("text-[9px] leading-none tabular-nums", active ? "text-sf-brown/60 dark:text-sf-gold/60" : "text-slate-400 dark:text-slate-500")}>
                {p.cols} × {p.rows}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function BulletinBoard({ isAdmin, activeUserId, departments, documents, onSelectDepartment, onSelectDoc }: BulletinBoardProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAnnouncementEditor, setShowAnnouncementEditor] = useState(false);
  const [showBannerEditor, setShowBannerEditor] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropId, setDropId] = useState<string | null>(null);
  const dragCounter = useRef<number[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
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
              className="rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 relative group"
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 auto-rows-[200px]">
            {pinned.map((ann) => (
              <BentoCard key={ann.id} announcement={ann} isAdmin={isAdmin}
                onClick={() => setSelectedAnnouncement(ann)}
                onEdit={() => { setEditingAnnouncement(ann); setShowAnnouncementEditor(true); }}
                onDelete={() => handleDeleteAnnouncement(ann.id)} deleting={deletingId === ann.id} onCancelDelete={() => setDeletingId(null)}
                isDragging={dragId === ann.id} isDropTarget={dropId === ann.id}
                onDragStart={() => handleDragStart(ann.id)} onDragEnd={handleDragEnd} onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(ann.id, e)} onDragLeave={() => handleDragLeave(ann.id)} onDrop={() => handleDrop(ann.id)} />
            ))}
          </div>
        </div>
      )}

      {/* All announcements */}
      {regular.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-bold text-sf-brown dark:text-slate-200 uppercase tracking-wider">Announcements</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 auto-rows-[200px]">
            {regular.map((ann) => (
              <BentoCard key={ann.id} announcement={ann} isAdmin={isAdmin}
                onClick={() => setSelectedAnnouncement(ann)}
                onEdit={() => { setEditingAnnouncement(ann); setShowAnnouncementEditor(true); }}
                onDelete={() => handleDeleteAnnouncement(ann.id)} deleting={deletingId === ann.id} onCancelDelete={() => setDeletingId(null)}
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
                <button key={dept.id} onClick={() => onSelectDepartment(dept.id)} className="text-left p-4 bg-white dark:bg-slate-800 rounded-2xl border border-sf-cream-dark dark:border-slate-700 hover:border-sf-gold/40 dark:hover:border-sf-gold/30 hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5 transition-all duration-200 group">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm" style={{ backgroundColor: dept.color }}>{dept.name.charAt(0)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{dept.name}</p>
                      <p className="text-[11px] text-slate-400">{deptDocs.length} manual{deptDocs.length !== 1 ? "s" : ""}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 group-hover:text-sf-gold group-hover:translate-x-0.5 transition-all" />
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

      {selectedAnnouncement && (
        <AnnouncementDetailModal
          announcement={selectedAnnouncement}
          isAdmin={isAdmin}
          activeUserId={activeUserId}
          onClose={() => setSelectedAnnouncement(null)}
          onEdit={() => { setSelectedAnnouncement(null); setEditingAnnouncement(selectedAnnouncement); setShowAnnouncementEditor(true); }}
          onChanged={() => loadData(true)}
        />
      )}
      {showAnnouncementEditor && (
        <AnnouncementEditorModal announcement={editingAnnouncement} departments={departments} onClose={() => { setShowAnnouncementEditor(false); setEditingAnnouncement(null); }} onSave={async () => { setShowAnnouncementEditor(false); setEditingAnnouncement(null); await loadData(); }} />
      )}
      {showBannerEditor && (
        <BannerEditorModal banner={editingBanner} departments={departments} onClose={() => { setShowBannerEditor(false); setEditingBanner(null); }} onSave={async () => { setShowBannerEditor(false); setEditingBanner(null); await loadData(); }} />
      )}
    </div>
  );
}

// ─── Announcement Detail Modal ──────────────────────────────────

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d ago` : new Date(iso).toLocaleDateString();
}

function AnnouncementDetailModal({ announcement, isAdmin, activeUserId, onClose, onEdit, onChanged }: {
  announcement: Announcement;
  isAdmin: boolean;
  activeUserId: string;
  onClose: () => void;
  onEdit: () => void;
  onChanged?: () => void;
}) {
  const [detail, setDetail] = useState<AnnouncementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [liking, setLiking] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [showViewers, setShowViewers] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const config = TYPE_CONFIG[announcement.type] || TYPE_CONFIG.info;
  const Icon = config.icon;
  const comments = detail?.comments ?? [];
  const commentTotal = comments.reduce((acc, t) => acc + 1 + t.replies.length, 0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.getAnnouncementDetail(announcement.id).then((d) => {
      if (!mounted) return;
      setDetail(d);
      setLoading(false);
      onChanged?.();
    });
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announcement.id]);

  const toggleLike = async () => {
    if (!detail || liking) return;
    setLiking(true);
    const prev = detail.likedByMe;
    setDetail({ ...detail, likedByMe: !prev, likeCount: Math.max(0, (detail.likeCount ?? 0) + (prev ? -1 : 1)) });
    const res = await api.toggleAnnouncementLike(detail.id);
    if (res) setDetail((p) => (p ? { ...p, likedByMe: res.liked, likeCount: res.count } : p));
    setLiking(false);
    onChanged?.();
  };

  const submitComment = async () => {
    const text = commentText.trim();
    if (!text || !detail || submitting) return;
    setSubmitting(true);
    const c = await api.addAnnouncementComment(detail.id, text);
    if (c) {
      setDetail((p) => (p ? { ...p, comments: [...p.comments, { ...c, replies: [] } as AnnouncementThread] } : p));
      setCommentText("");
      onChanged?.();
    }
    setSubmitting(false);
  };

  const submitReply = async (threadId: string) => {
    const text = replyText.trim();
    if (!text || !detail || submitting) return;
    setSubmitting(true);
    const c = await api.addAnnouncementComment(detail.id, text, threadId);
    if (c) {
      setDetail((p) => p ? {
        ...p,
        comments: p.comments.map((t) => t.id === threadId ? { ...t, replies: [...t.replies, c] } : t),
      } : p);
      setReplyToId(null);
      setReplyText("");
      onChanged?.();
    }
    setSubmitting(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (deletingId) return;
    setDeletingId(commentId);
    const ok = await api.deleteAnnouncementComment(commentId);
    if (ok) {
      setDetail((p) => p ? {
        ...p,
        comments: p.comments
          .filter((t) => t.id !== commentId)
          .map((t) => ({ ...t, replies: t.replies.filter((r) => r.id !== commentId) })),
      } : p);
      onChanged?.();
    }
    setDeletingId(null);
  };

  const canManage = (userId: string) => isAdmin || userId === activeUserId;

  const sortByPop = (list: any[]) =>
    [...list].sort((a, b) => ((b.likeCount ?? 0) - (a.likeCount ?? 0)) || (a.createdAt < b.createdAt ? -1 : 1));

  const applyCommentLike = async (commentId: string) => {
    const res = await api.toggleCommentLike(commentId);
    if (!res || !detail) return;
    setDetail((prev) => {
      if (!prev) return prev;
      const updateThread = (t: AnnouncementThread): AnnouncementThread => {
        const head = t.id === commentId ? { ...t, likedByMe: res.liked, likeCount: res.count } : t;
        const replies = t.replies.map((r) =>
          r.id === commentId ? { ...r, likedByMe: res.liked, likeCount: res.count } : r
        );
        return { ...head, replies: sortByPop(replies) };
      };
      const comments = sortByPop(prev.comments.map(updateThread));
      comments.forEach((t, i) => {
        t.rank = i + 1;
        t.replies.forEach((r, j) => { r.rank = j + 1; });
      });
      return { ...prev, comments };
    });
  };

  const renderCommentActions = ({ id, userId, isThread, likeCount = 0, likedByMe = false }: {
    id: string; userId: string; isThread: boolean; likeCount?: number; likedByMe?: boolean;
  }) => (
    <div className="flex items-center gap-2.5">
      <button
        onClick={() => applyCommentLike(id)}
        className={cn(
          "inline-flex items-center gap-1 text-[11px] font-medium transition-colors",
          likedByMe ? "text-sf-brown dark:text-sf-gold" : "text-slate-400 hover:text-sf-brown dark:hover:text-sf-gold"
        )}
      >
        <ThumbsUp className={cn("w-3 h-3", likedByMe && "fill-current")} />
        {likeCount > 0 && <span className="tabular-nums">{likeCount}</span>}
      </button>
      {isThread && (
        <button
          onClick={() => setReplyToId(replyToId === id ? null : id)}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-sf-brown dark:hover:text-sf-gold transition-colors"
        >
          <Reply className="w-3 h-3" /> Reply
        </button>
      )}
      {canManage(userId) && (
        <button
          onClick={() => handleDeleteComment(id)}
          disabled={deletingId === id}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-300 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-3 h-3" /> Delete
        </button>
      )}
    </div>
  );

  const renderComment = (c: AnnouncementThread) => (
    <div key={c.id} className="rounded-xl border border-sf-cream-dark dark:border-slate-600 p-3">
      <div className="flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-full bg-sf-cream dark:bg-slate-600 text-sf-brown dark:text-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
          {c.authorName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{c.authorName}</span>
            {c.authorRole === "admin" && (
              <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-sf-gold/15 text-sf-brown-dark dark:text-sf-gold">Admin</span>
            )}
            {!!c.rank && (
              <span className={cn(
                "text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                c.rank === 1 ? "bg-sf-gold text-sf-brown" : "bg-sf-cream dark:bg-slate-600 text-slate-400 dark:text-slate-300"
              )}>
                {c.rank === 1 ? "Top comment" : `#${c.rank}`}
              </span>
            )}
            <span className="text-[10px] text-slate-400">{timeAgo(c.createdAt)}</span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5 whitespace-pre-wrap">{c.body}</p>
          <div className="mt-1.5">{renderCommentActions({ id: c.id, userId: c.userId, isThread: true, likeCount: c.likeCount, likedByMe: c.likedByMe })}</div>
        </div>
      </div>

      {replyToId === c.id && (
        <div className="mt-2 ml-9">
          <div className="flex gap-2">
            <input
              type="text"
              name="reply"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submitReply(c.id); }}
              placeholder={`Reply to ${c.authorName}…`}
              className="flex-1 px-3 py-1.5 border border-sf-cream-dark dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-xs"
              autoFocus
            />
            <button
              onClick={() => submitReply(c.id)}
              disabled={!replyText.trim() || submitting}
              className="px-3 py-1.5 text-xs font-semibold bg-sf-brown hover:bg-sf-brown-dark text-white rounded-lg transition-colors disabled:opacity-40 shrink-0"
            >
              Reply
            </button>
          </div>
        </div>
      )}

      {c.replies.length > 0 && (
        <div className="mt-2 ml-9 space-y-2 border-l-2 border-sf-cream-dark dark:border-slate-600 pl-3">
          {c.replies.map((r) => (
            <div key={r.id}>
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-sf-cream dark:bg-slate-600 text-sf-brown dark:text-slate-200 flex items-center justify-center font-bold text-[10px] shrink-0">
                  {r.authorName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{r.authorName}</span>
                    {r.authorRole === "admin" && (
                      <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-sf-gold/15 text-sf-brown-dark dark:text-sf-gold">Admin</span>
                    )}
                    <span className="text-[10px] text-slate-400">{timeAgo(r.createdAt)}</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{r.body}</p>
                  <div className="mt-1">{renderCommentActions({ id: r.id, userId: r.userId, isThread: false, likeCount: r.likeCount, likedByMe: r.likedByMe })}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center backdrop-blur-xs" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 w-full sm:max-w-2xl sm:rounded-2xl shadow-2xl max-h-[100dvh] sm:max-h-[90vh] flex flex-col rounded-t-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-sf-cream-dark dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn("p-1.5 rounded-lg", config.bg)}>
              <Icon className={cn("w-4 h-4", config.color)} />
            </div>
            <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", config.bg, config.color)}>{config.label}</span>
            {announcement.isPinned && <Pin className="w-3 h-3 text-sf-gold shrink-0" />}
          </div>
          <div className="flex items-center gap-1">
            {isAdmin && (
              <button onClick={onEdit} className="p-2 rounded-lg text-slate-400 hover:text-sf-brown hover:bg-sf-cream dark:hover:bg-slate-700 transition-colors">
                <Pencil className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-sf-cream dark:hover:bg-slate-700 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {announcement.imageUrl && (
            <div className="w-full bg-gradient-to-b from-slate-100 to-white dark:from-slate-800 dark:to-slate-800">
              <img src={announcement.imageUrl} alt={announcement.title} className="w-full max-h-[50vh] object-contain" />
            </div>
          )}

          <div className="p-5 sm:p-6 pb-4 space-y-4">
            <div className="flex items-start gap-3">
              {announcement.emoji && !announcement.imageUrl && (
                <span className="text-4xl shrink-0 leading-none mt-0.5">{announcement.emoji}</span>
              )}
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 leading-tight">{announcement.title}</h2>
            </div>

            {announcement.content && (
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base whitespace-pre-wrap">{announcement.content}</p>
            )}

            <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap pt-2 border-t border-sf-cream-dark dark:border-slate-700">
              {announcement.departmentNames.length > 0 ? (
                <span className="flex items-center gap-1.5 flex-wrap">
                  {announcement.departmentNames.map((name, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: announcement.departmentColors[i] || "#999" }} />
                      {name}
                    </span>
                  ))}
                </span>
              ) : (
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300" />All Departments</span>
              )}
              {announcement.authorName && <span>By {announcement.authorName}</span>}
              <span>{new Date(announcement.createdAt).toLocaleDateString()}</span>
              {announcement.expiresAt && <span className="text-amber-500">Expires {new Date(announcement.expiresAt).toLocaleDateString()}</span>}
            </div>

            {/* Engagement stats bar */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <button
                onClick={toggleLike}
                disabled={!detail || liking}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all disabled:opacity-60",
                  detail?.likedByMe
                    ? "bg-sf-brown text-white border-sf-brown dark:bg-sf-brown-dark"
                    : "text-slate-500 dark:text-slate-300 border-sf-cream-dark dark:border-slate-600 hover:border-sf-gold/50 hover:text-sf-brown dark:hover:text-sf-gold"
                )}
              >
                <ThumbsUp className={cn("w-3.5 h-3.5", detail?.likedByMe && "fill-current")} />
                {detail?.likeCount ?? 0} {detail?.likeCount === 1 ? "like" : "likes"}
              </button>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-500 dark:text-slate-300 bg-sf-cream dark:bg-slate-700 border border-sf-cream-dark dark:border-slate-600">
                <MessageCircle className="w-3.5 h-3.5" /> {detail ? commentTotal : (announcement.commentCount ?? 0)} comments
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-500 dark:text-slate-300 bg-sf-cream dark:bg-slate-700 border border-sf-cream-dark dark:border-slate-600">
                <Eye className="w-3.5 h-3.5" /> {detail?.viewCount ?? announcement.viewCount ?? 0} {detail?.viewCount === 1 ? "view" : "views"}
              </span>
            </div>

            {/* Admin: who viewed */}
            {isAdmin && detail?.viewers && (
              <div className="rounded-xl border border-sf-cream-dark dark:border-slate-600 overflow-hidden">
                <button
                  onClick={() => setShowViewers((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold text-sf-brown dark:text-slate-200 hover:bg-sf-cream dark:hover:bg-slate-700 transition-colors"
                >
                  <span className="flex items-center gap-2"><Eye className="w-4 h-4 text-sf-gold" /> Who viewed this ({detail.viewers.length})</span>
                  <ChevronRight className={cn("w-4 h-4 transition-transform", showViewers && "rotate-90")} />
                </button>
                {showViewers && (
                  <div className="max-h-44 overflow-y-auto divide-y divide-sf-cream-dark dark:divide-slate-600 bg-sf-cream/40 dark:bg-slate-800/50">
                    {detail.viewers.length === 0 ? (
                      <p className="px-4 py-3 text-xs text-slate-400">No one has viewed this yet.</p>
                    ) : detail.viewers.map((v) => (
                      <div key={v.userId} className="flex items-center gap-2.5 px-4 py-2">
                        <div className="w-7 h-7 rounded-full bg-white dark:bg-slate-600 border border-sf-cream-dark dark:border-slate-500 flex items-center justify-center font-bold text-xs text-sf-brown dark:text-slate-200 shrink-0">
                          {v.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{v.name}</p>
                          <p className="text-[10px] text-slate-400">Viewed {timeAgo(v.lastViewedAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="px-5 sm:px-6 pb-6">
            <div className="rounded-2xl border border-sf-cream-dark dark:border-slate-600 overflow-hidden">
              <div className="px-4 py-2.5 bg-sf-cream dark:bg-slate-700 border-b border-sf-cream-dark dark:border-slate-600 flex items-center justify-between">
                <span className="text-xs font-bold text-sf-brown dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-sf-gold" /> Discussion
                </span>
                <span className="text-[11px] text-slate-400">{loading ? "…" : `${commentTotal} comment${commentTotal === 1 ? "" : "s"}`}</span>
              </div>

              <div className="p-3 space-y-2 max-h-72 overflow-y-auto bg-white dark:bg-slate-800">
                {loading ? (
                  <p className="text-xs text-slate-400 text-center py-6">Loading discussion…</p>
                ) : comments.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">Be the first to comment.</p>
                ) : (
                  comments.map((c) => renderComment(c))
                )}
              </div>

              {/* Composer */}
              <div className="px-3 py-3 border-t border-sf-cream-dark dark:border-slate-600 bg-sf-cream/40 dark:bg-slate-700/50">
                <div className="flex items-start gap-2">
                    <textarea
                      name="comment"
                      id={`comment-${announcement.id}`}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      rows={2}
                    placeholder="Share a comment…"
                    className="flex-1 px-3 py-2 border border-sf-cream-dark dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-xs resize-none"
                  />
                  <button
                    onClick={submitComment}
                    disabled={!commentText.trim() || submitting || !detail}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sf-brown hover:bg-sf-brown-dark text-white text-xs font-semibold transition-colors disabled:opacity-40 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" /> Comment
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Bento Card ─────────────────────────────────────────────────

function BentoCard({ announcement: ann, isAdmin, onClick, onEdit, onDelete, deleting, onCancelDelete, isDragging, isDropTarget, onDragStart, onDragEnd, onDragOver, onDragEnter, onDragLeave, onDrop }: {
  announcement: Announcement; isAdmin: boolean; onClick: () => void; onEdit: () => void; onDelete: () => void; deleting: boolean; onCancelDelete: () => void;
  isDragging?: boolean; isDropTarget?: boolean;
  onDragStart?: () => void; onDragEnd?: () => void; onDragOver?: (e: React.DragEvent) => void;
  onDragEnter?: (e: React.DragEvent) => void; onDragLeave?: () => void; onDrop?: () => void;
}) {
  const config = TYPE_CONFIG[ann.type] || TYPE_CONFIG.info;
  const Icon = config.icon;
  const gridSize = ann.gridSize || "medium";
  const isMultiRow = gridSize.includes("tall") || gridSize === "large" || gridSize === "xlarge" || gridSize === "hero-3" || gridSize === "hero-4";
  const isTall3 = gridSize === "tall-3" || gridSize === "hero-3";
  const isTall4 = gridSize === "tall-4" || gridSize === "hero-4";
  const isHero = gridSize === "hero" || gridSize === "hero-3" || gridSize === "hero-4";
  const hasImage = !!ann.imageUrl;
  const isSmall = !isMultiRow && !isHero;
  const isTruncated = isSmall && ann.content && ann.content.length > 120;

  // Responsive image minimum heights: the image grows (flex-1) to fill extra card height,
  // min-height guarantees a reasonable floor so images never collapse to a sliver.
  const imageHeightClass = isTall4 ? "min-h-40 sm:min-h-52" : isTall3 ? "min-h-32 sm:min-h-44" : isHero ? "min-h-28 sm:min-h-40" : isMultiRow ? "min-h-24 sm:min-h-32" : "min-h-14 sm:min-h-16";

  return (
    <div
      draggable={isAdmin}
      onDragStart={() => onDragStart?.()}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
      className={cn("rounded-2xl border overflow-hidden transition-all duration-200 relative group flex flex-col cursor-pointer bg-white dark:bg-slate-800 hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5 hover:border-sf-gold/40", config.border, GRID_SIZE_CLASSES[gridSize], isDragging && "opacity-40 scale-95", isDropTarget && "ring-2 ring-sf-gold/50 border-sf-gold border-dashed bg-sf-cream/30")}
    >
      {/* Image — grows (flex-1) to fill extra vertical space on taller cards */}
      {hasImage && (
        <div className={cn("w-full overflow-hidden relative flex-1 min-h-0", imageHeightClass)}>
          <img src={ann.imageUrl!} alt={ann.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
      )}

      <div className={cn("p-4 min-h-0", hasImage ? "shrink-0" : "flex-1", !hasImage && config.bg)}>
        <div className="flex items-start gap-3 h-full">
          {ann.emoji && !hasImage && (
            <span className="text-2xl shrink-0 leading-none">{ann.emoji}</span>
          )}
          {!hasImage && !ann.emoji && (
            <div className={cn("p-2 rounded-lg shrink-0", config.bg)}>
              <Icon className={cn("w-4 h-4", config.color)} />
            </div>
          )}
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h4 className={cn("font-bold text-slate-900 dark:text-slate-100", isMultiRow || isHero ? "text-lg" : "text-sm")}>{ann.title}</h4>
              {ann.isPinned && <Pin className="w-3 h-3 text-sf-gold shrink-0" />}
              <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", config.bg, config.color)}>{config.label}</span>
            </div>
            {/* Content with foggy bottom for truncated text */}
            {ann.content && (
              <div className="relative flex-1 min-h-0">
                <p className={cn("text-slate-600 dark:text-slate-400 leading-relaxed", isMultiRow || isHero ? "text-sm" : "text-xs", isSmall && "line-clamp-3")}>{ann.content}</p>
                {isTruncated && !isMultiRow && (
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white dark:from-slate-800 via-white/80 dark:via-slate-800/80 to-transparent pointer-events-none" />
                )}
              </div>
            )}
            <div className="flex items-center gap-3 mt-auto pt-2 text-[11px] text-slate-400 flex-wrap shrink-0">
              {ann.departmentNames.length > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ann.departmentColors[0] || "#999" }} />
                  {ann.departmentNames.length === 1 ? ann.departmentNames[0] : `${ann.departmentNames.length} depts`}
                </span>
              )}
              {ann.authorName && <span>By {ann.authorName}</span>}
              <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
              {ann.expiresAt && <span className="text-amber-500">Expires {new Date(ann.expiresAt).toLocaleDateString()}</span>}
              <span className="ml-auto flex items-center gap-2 shrink-0 text-slate-400 dark:text-slate-400">
                <span className="flex items-center gap-1 font-semibold" title={`${ann.likeCount ?? 0} likes`}>
                  <ThumbsUp className={cn("w-3 h-3", ann.likedByMe ? "text-sf-gold fill-sf-gold" : "")} />
                  {ann.likeCount ?? 0}
                </span>
                <span className="flex items-center gap-1 font-semibold" title={`${ann.commentCount ?? 0} comments`}>
                  <MessageCircle className="w-3 h-3" />
                  {ann.commentCount ?? 0}
                </span>
                <span className="flex items-center gap-1 font-semibold" title={`${ann.viewCount ?? 0} views`}>
                  <Eye className="w-3 h-3" />
                  {ann.viewCount ?? 0}
                </span>
              </span>
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-1 shrink-0 hidden group-hover:flex">
              <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1.5 rounded-md text-slate-400 hover:text-sf-brown hover:bg-white/50 dark:hover:bg-slate-700 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
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

// ─── Image Upload Component ─────────────────────────────────────

function ImageUploadInput({ value, onChange, label }: { value: string; onChange: (url: string) => void; label: string }) {
  const [tab, setTab] = useState<"url" | "upload">("url");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    const result = await api.uploadFile(file);
    if (result?.url) {
      onChange(result.url);
    }
    setUploading(false);
  };

  return (
    <div>
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><ImagePlus className="w-3 h-3" /> {label}</label>
      <div className="flex gap-1 mb-2 bg-sf-cream dark:bg-slate-700 rounded-lg p-0.5">
        <button onClick={() => setTab("url")} className={cn("flex-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center justify-center gap-1", tab === "url" ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-xs" : "text-slate-500")}>
          <LinkIcon className="w-3 h-3" /> URL
        </button>
        <button onClick={() => setTab("upload")} className={cn("flex-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center justify-center gap-1", tab === "upload" ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-xs" : "text-slate-500")}>
          <Upload className="w-3 h-3" /> Upload
        </button>
      </div>
      {tab === "url" ? (
        <input type="url" value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 border border-sf-cream-dark dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-sm" placeholder="https://example.com/image.jpg" />
      ) : (
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const f = e.dataTransfer.files[0]; if (f) handleUpload(f); }}
          className="w-full px-3 py-4 border-2 border-dashed border-sf-cream-dark dark:border-slate-600 rounded-lg text-center cursor-pointer hover:border-sf-gold/50 transition-colors"
        >
          {uploading ? (
            <p className="text-xs text-slate-400">Uploading...</p>
          ) : (
            <p className="text-xs text-slate-400"><Upload className="w-4 h-4 mx-auto mb-1" /> Click or drag image here</p>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
        </div>
      )}
      {value && (
        <div className="mt-2 rounded-lg overflow-hidden h-24 border border-sf-cream-dark dark:border-slate-600 relative">
          <img src={value} alt="Preview" className="w-full h-full object-cover" />
          <button onClick={() => onChange("")} className="absolute top-1 right-1 p-1 rounded bg-black/50 text-white hover:bg-red-600 transition-colors"><X className="w-3 h-3" /></button>
        </div>
      )}
    </div>
  );
}

// ─── Announcement Editor Modal ──────────────────────────────────

function AnnouncementEditorModal({ announcement, departments, onClose, onSave }: {
  announcement: Announcement | null; departments: Department[]; onClose: () => void; onSave: () => void;
}) {
  const [title, setTitle] = useState(announcement?.title ?? "");
  const [content, setContent] = useState(announcement?.content ?? "");
  const [type, setType] = useState(announcement?.type ?? "info");
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>(announcement?.departmentIds ?? []);
  const [priority, setPriority] = useState(announcement?.priority ?? 0);
  const [isPinned, setIsPinned] = useState(announcement?.isPinned ?? false);
  const [imageUrl, setImageUrl] = useState(announcement?.imageUrl ?? "");
  const [emoji, setEmoji] = useState(announcement?.emoji ?? "");
  const [gridSize, setGridSize] = useState<string>(announcement?.gridSize ?? "medium");
  const [expiresAt, setExpiresAt] = useState(announcement?.expiresAt?.slice(0, 10) ?? "");
  const [sendToWebhook, setSendToWebhook] = useState(announcement?.sendToWebhook ?? false);
  const [saving, setSaving] = useState(false);

  const toggleDept = (id: string) => {
    setSelectedDeptIds((prev) => prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const data = {
      title: title.trim(), content, type, departmentIds: selectedDeptIds,
      priority, isPinned, imageUrl: imageUrl || null, emoji: emoji || null,
      gridSize, sendToWebhook, expiresAt: expiresAt || null,
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

          {/* Image */}
          <ImageUploadInput value={imageUrl} onChange={setImageUrl} label="Image (optional)" />

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
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Priority</label>
              <select value={priority} onChange={(e) => setPriority(Number(e.target.value))} className="w-full px-3 py-2 border border-sf-cream-dark dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-sm">
                <option value={0}>Normal</option>
                <option value={1}>High</option>
                <option value={2}>Urgent</option>
              </select>
            </div>
          </div>

          {/* Grid Size visual mosaic picker */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Grid2x2 className="w-3 h-3" /> Grid Size</label>
            <GridSizePicker value={gridSize} onChange={setGridSize} />
            <p className="text-[11px] text-slate-400 mt-1.5">
              Choose how much space this announcement takes on the board. Dark tiles show the cell span.
            </p>
          </div>

          {/* Multi-department checkboxes */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Departments (leave empty for all)</label>
            <div className="flex flex-wrap gap-2">
              {departments.map((d) => (
                <label key={d.id} className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors", selectedDeptIds.includes(d.id) ? "border-sf-gold bg-sf-cream dark:bg-slate-700 text-sf-brown dark:text-slate-100" : "border-sf-cream-dark dark:border-slate-600 text-slate-500 hover:border-sf-gold/30")}>
                  <input type="checkbox" checked={selectedDeptIds.includes(d.id)} onChange={() => toggleDept(d.id)} className="sr-only" />
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  {d.name}
                </label>
              ))}
            </div>
          </div>

          <div className="max-w-[220px]">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Expires On</label>
              <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="w-full px-3 py-2 border border-sf-cream-dark dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-sm" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-sf-brown focus:ring-sf-gold" />
              <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">Pin to top</span>
            </label>
            {selectedDeptIds.length > 0 && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={sendToWebhook} onChange={(e) => setSendToWebhook(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-green-600 focus:ring-green-500" />
                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1"><Send className="w-3 h-3 text-green-600" /> Send to WhatsApp</span>
              </label>
            )}
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

// ─── Banner Editor Modal ────────────────────────────────────────

function BannerEditorModal({ banner, departments, onClose, onSave }: { banner: Banner | null; departments: Department[]; onClose: () => void; onSave: () => void }) {
  const [title, setTitle] = useState(banner?.title ?? "");
  const [subtitle, setSubtitle] = useState(banner?.subtitle ?? "");
  const [bgColor, setBgColor] = useState(banner?.bgColor ?? "#5C3A1E");
  const [textColor, setTextColor] = useState(banner?.textColor ?? "#FFFFFF");
  const [gradient, setGradient] = useState(banner?.gradient ?? "");
  const [imageUrl, setImageUrl] = useState(banner?.imageUrl ?? "");
  const [linkUrl, setLinkUrl] = useState(banner?.linkUrl ?? "");
  const [sendToWebhook, setSendToWebhook] = useState(banner?.sendToWebhook ?? false);
  const [saving, setSaving] = useState(false);

  const previewStyle: React.CSSProperties = {
    color: textColor,
    ...(gradient ? { background: gradient } : imageUrl ? {} : { backgroundColor: bgColor }),
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    if (banner) {
      await api.updateBanner(banner.id, { title: title.trim(), subtitle, bgColor, textColor, gradient: gradient || null, imageUrl: imageUrl || null, linkUrl: linkUrl || null, sendToWebhook } as any);
    } else {
      await api.createBanner({ title: title.trim(), subtitle, bgColor, textColor, gradient: gradient || undefined, imageUrl: imageUrl || undefined, linkUrl: linkUrl || undefined, sendToWebhook });
    }
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
          <ImageUploadInput value={imageUrl} onChange={setImageUrl} label="Background Image" />

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

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={sendToWebhook} onChange={(e) => setSendToWebhook(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-green-600 focus:ring-green-500" />
            <span className="text-sm text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1"><Send className="w-3 h-3 text-green-600" /> Send to WhatsApp</span>
          </label>
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-sf-cream-dark dark:border-slate-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 font-medium hover:bg-sf-cream dark:hover:bg-slate-700 rounded-lg transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={!title.trim() || saving} className="px-4 py-2 text-sm bg-sf-brown hover:bg-sf-brown-dark text-white font-medium rounded-lg transition-colors shadow-xs disabled:opacity-50">{saving ? "Saving..." : banner ? "Update" : "Create"}</button>
        </div>
      </div>
    </div>
  );
}
