import { useState, useCallback, useEffect } from "react";
import type { PolicyDocument, User, Department } from "@/types";
import type { SectionFormValues } from "@/components/SectionFormModal";
import * as api from "@/api";
import { getSession, logout } from "@/auth";
import { cn } from "@/lib/utils";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { DocumentReader } from "@/components/DocumentReader";
import { AdminDashboard } from "@/components/AdminDashboard";
import { ReportsView } from "@/components/ReportsView";
import { AuthModal } from "@/components/AuthModal";
import { NewDocModal } from "@/components/NewDocModal";
import { NewSectionModal } from "@/components/NewSectionModal";
import { EditSectionModal } from "@/components/EditSectionModal";
import { UserSettings } from "@/components/UserSettings";
import { ToastProvider, useToast } from "@/components/Toast";
import { DueDateDashboard } from "@/components/DueDateDashboard";
import { VersionHistory } from "@/components/VersionHistory";
import { ImportExport } from "@/components/ImportExport";
import { BulletinBoard } from "@/components/BulletinBoard";
import { TrainingView } from "@/components/Training";
import { Tip } from "@/components/Tip";
import { applyTheme } from "@/themes";
import { ListPlus, BarChart3, BookOpen, Calendar, Mail, X, Trash2, RotateCcw, Search, ChevronRight } from "lucide-react";

function AppInner() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [documents, setDocuments] = useState<PolicyDocument[]>([]);
  const [tracking, setTracking] = useState<Record<string, boolean>>({});
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [viewingReports, setViewingReports] = useState(false);
  const [viewingOverallAnalytics, setViewingOverallAnalytics] = useState(false);
  const [viewingDueDates, setViewingDueDates] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showNewDoc, setShowNewDoc] = useState(false);
  const [showNewSection, setShowNewSection] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sf_dark_mode") === "true";
    }
    return false;
  });
  const [versionSectionId, setVersionSectionId] = useState<string | null>(null);
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [viewingTrash, setViewingTrash] = useState(false);
  const [trashDocs, setTrashDocs] = useState<{ id: string; title: string; deletedAt: string }[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [activeDepartmentId, setActiveDepartmentId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"bulletin" | "manuals" | "training">("bulletin");
  const [userTheme, setUserTheme] = useState("safari");

  const loadDocs = useCallback(async () => {
    const docs = await api.getDocuments();
    setDocuments(docs);
  }, []);

  const loadTracking = useCallback(async () => {
    const t = await api.getTracking();
    setTracking(t);
  }, []);

  const loadTrash = useCallback(async () => {
    const trash = await api.getTrash();
    setTrashDocs(trash);
  }, []);

  const loadDepartments = useCallback(async () => {
    const depts = await api.getDepartments();
    setDepartments(depts);
  }, []);

  const handleRestore = useCallback(async (docId: string) => {
    await api.restoreDocument(docId);
    await loadTrash();
    await loadDocs();
    toast("Document restored", "success");
  }, [loadTrash, loadDocs, toast]);

  const handleTrashDoc = useCallback(async (docId: string) => {
    await api.deleteDocument(docId);
    await loadDocs();
    if (activeDocId === docId) setActiveDocId(null);
    toast("Document moved to trash", "success");
  }, [loadDocs, activeDocId, toast]);

  const handleEditDueDate = useCallback(async (docId: string, dueDate: string | null) => {
    await api.updateDocument(docId, { due_date: dueDate } as any);
    await loadDocs();
    toast("Due date updated", "success");
  }, [loadDocs, toast]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("sf_dark_mode", String(isDark));
  }, [isDark]);

  useEffect(() => {
    applyTheme(userTheme);
  }, [userTheme]);

  useEffect(() => {
    (async () => {
      try {
        const session = await getSession();
        if (session) {
          setUser(session);
          setUserTheme(session.theme || "safari");
          await loadDocs();
          await loadTracking();
          await loadDepartments();
        } else {
          setShowAuth(true);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleAuth = useCallback(async () => {
    const session = await getSession();
    if (session) {
      setUser(session);
      setUserTheme(session.theme || "safari");
      await loadDocs();
      await loadTracking();
      await loadDepartments();
      setShowAuth(false);
      toast("Welcome back!", "success");
      if (session.role !== "admin" && !session.email) {
        setTimeout(() => setShowEmailPrompt(true), 1500);
      }
    }
  }, [loadDocs, loadTracking, toast]);

  const handleSaveEmail = useCallback(async () => {
    if (!user || !emailInput.includes("@")) return;
    const result = await api.updateEmail(user.id, emailInput);
    if (result.ok) {
      setUser({ ...user, email: emailInput });
      setShowEmailPrompt(false);
      toast("Email saved successfully", "success");
    } else {
      toast(result.error || "Failed to save email", "error");
    }
  }, [user, emailInput, toast]);

  const handleLogout = useCallback(async () => {
    await logout();
    setUser(null);
    setActiveDocId(null);
    setViewingReports(false);
    setShowAuth(true);
  }, []);

  const handleViewChange = useCallback((view: "bulletin" | "manuals" | "training") => {
    setActiveView(view);
    if (view === "bulletin") {
      setActiveDocId(null);
      setViewingReports(false);
      setViewingOverallAnalytics(false);
      setViewingDueDates(false);
      setViewingTrash(false);
      setActiveDepartmentId(null);
    }
    if (view === "training") {
      setActiveDocId(null);
      setViewingReports(false);
      setViewingOverallAnalytics(false);
      setViewingDueDates(false);
      setViewingTrash(false);
    }
  }, []);

  const handleSelectDoc = useCallback((docId: string) => {
    setActiveDocId(docId);
    setViewingReports(false);
    setViewingOverallAnalytics(false);
    setViewingDueDates(false);
    setSearchQuery("");
  }, []);

  const handleToggleRead = useCallback(
    async (sectionId: string) => {
      if (!user) return;
      const isRead = !!tracking[sectionId];
      await api.toggleRead(sectionId, !isRead);
      const next = { ...tracking };
      if (isRead) {
        delete next[sectionId];
      } else {
        next[sectionId] = true;
      }
      setTracking(next);
    },
    [user, tracking]
  );

  const handleCreateDoc = useCallback(
    async (title: string, dueDate?: string | null, tags?: string[], departmentId?: string | null) => {
      const doc = await api.createDocument(title, dueDate);
      if (doc) {
        if (departmentId) {
          await api.updateDocument(doc.id, { departmentId } as any);
        }
        if (tags && tags.length > 0) {
          for (const tag of tags) {
            await api.addTag(doc.id, tag);
          }
        }
        await loadDocs();
        setShowNewDoc(false);
        setActiveDocId(doc.id);
        toast("Document created", "success");
      }
    },
    [loadDocs, toast]
  );

  const handleCreateSection = useCallback(
    async (values: SectionFormValues) => {
      if (!activeDocId) return;
      await api.createSection(activeDocId, {
        title: values.title,
        type: values.type,
        content: values.content,
        url: values.url,
        originalUrl: values.originalUrl,
        size: values.size,
      });
      await loadDocs();
      setShowNewSection(false);
      toast("Section added", "success");
    },
    [activeDocId, loadDocs, toast]
  );

  const handleEditSection = useCallback((sectionId: string) => {
    setEditingSectionId(sectionId);
  }, []);

  const handleSaveEdit = useCallback(
    async (values: SectionFormValues) => {
      if (!editingSectionId) return;
      const ok = await api.updateSection(editingSectionId, {
        title: values.title,
        type: values.type,
        content: values.content,
        url: values.url,
        originalUrl: values.originalUrl,
        size: values.size,
      });
      if (ok) {
        await loadDocs();
        setEditingSectionId(null);
        toast("Section updated", "success");
      } else {
        toast("Failed to update section", "error");
      }
    },
    [editingSectionId, loadDocs, toast]
  );

  const handleMarkCompleted = useCallback(
    async (sectionId: string) => {
      if (tracking[sectionId]) return;
      await api.toggleRead(sectionId, true);
      setTracking((prev) => ({ ...prev, [sectionId]: true }));
      toast("Video completed — section marked as read", "success");
    },
    [tracking, toast]
  );

  const handleReorder = useCallback(
    async (fromIndex: number, toIndex: number) => {
      const next = [...documents];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      setDocuments(next);
      const order = next.map((d, i) => ({ id: d.id, sort_order: i }));
      await api.reorderDocuments(order);
    },
    [documents]
  );

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
  }, []);

  const handleThemeChange = useCallback((theme: string) => {
    setUserTheme(theme);
    if (user) setUser({ ...user, theme });
  }, [user]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-sf-cream dark:bg-slate-950">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-sf-brown flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg viewBox="0 0 200 200" className="w-8 h-8">
              <rect width="200" height="200" rx="32" fill="#5C3A1E"/>
              <path d="M100 95 C90 85, 65 70, 30 60 C40 65, 55 72, 65 80 C50 75, 35 68, 18 62 C30 70, 50 80, 68 88 C55 84, 40 78, 25 74 C40 82, 58 90, 72 96 C62 93, 48 88, 35 84 C48 90, 62 96, 75 102 C68 100, 58 96, 50 92 C60 97, 72 102, 82 106 C78 105, 70 102, 64 99 C72 103, 82 108, 90 112 L95 108 Z" fill="#C8A951"/>
              <path d="M100 95 C110 85, 135 70, 170 60 C160 65, 145 72, 135 80 C150 75, 165 68, 182 62 C170 70, 150 80, 132 88 C145 84, 160 78, 175 74 C160 82, 142 90, 128 96 C138 93, 152 88, 165 84 C152 90, 138 96, 125 102 C132 100, 142 96, 150 92 C140 97, 128 102, 118 106 C122 105, 130 102, 136 99 C128 103, 118 108, 110 112 L105 108 Z" fill="#C8A951"/>
              <ellipse cx="100" cy="110" rx="12" ry="22" fill="#C8A951"/>
              <circle cx="100" cy="85" r="10" fill="#C8A951"/>
            </svg>
          </div>
          <div className="w-6 h-6 border-2 border-sf-brown/30 border-t-sf-brown rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthModal isOpen={showAuth} onAuth={handleAuth} />;
  }

  const activeDoc = documents.find((d) => d.id === activeDocId) ?? null;
  const isAdmin = user.role === "admin";

  let docMetaText = "Choose a document from the sidebar to begin reading.";
  if (activeDoc) {
    const total = activeDoc.sections.length;
    let read = 0;
    activeDoc.sections.forEach((s) => {
      if (tracking[s.id]) read++;
    });
    docMetaText = `Your progress: ${read} of ${total} sections read.`;
  }

  const editingSection = editingSectionId
    ? activeDoc?.sections.find((s) => s.id === editingSectionId) ?? null
    : null;

  const showAnalytics = viewingReports || viewingOverallAnalytics;

  return (
    <div className="bg-sf-cream dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans h-screen flex flex-col overflow-hidden">
      <Header
        user={user}
        onLogout={handleLogout}
        onOpenSettings={() => setShowSettings(true)}
        isDark={isDark}
        onToggleDark={() => setIsDark((d) => !d)}
        onSearch={handleSearch}
        activeView={activeView}
        onViewChange={handleViewChange}
      />

      <AuthModal isOpen={false} onAuth={handleAuth} />
      <UserSettings isOpen={showSettings} onClose={() => setShowSettings(false)} currentUser={user} departments={departments} onRefreshDepartments={loadDepartments} onThemeChange={handleThemeChange} />
      <NewDocModal
        isOpen={showNewDoc}
        onClose={() => setShowNewDoc(false)}
        onSave={handleCreateDoc}
        departments={departments}
        preselectedDepartmentId={activeDepartmentId}
      />
      <NewSectionModal
        isOpen={showNewSection}
        onClose={() => setShowNewSection(false)}
        onSave={handleCreateSection}
      />
      <EditSectionModal
        isOpen={!!editingSectionId}
        onClose={() => setEditingSectionId(null)}
        onSave={handleSaveEdit}
        initialTitle={editingSection?.title ?? ""}
        initialType={editingSection?.type ?? "richtext"}
        initialContent={editingSection?.content ?? ""}
        initialUrl={editingSection?.url ?? null}
        initialOriginalUrl={editingSection?.originalUrl ?? null}
        initialSize={editingSection?.size ?? "large"}
      />
      {versionSectionId && (
        <VersionHistory
          sectionId={versionSectionId}
          onClose={() => setVersionSectionId(null)}
        />
      )}

      {showEmailPrompt && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6 border border-sf-cream-dark dark:border-slate-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-sf-brown dark:text-slate-100 flex items-center gap-2">
                <Mail className="w-5 h-5 text-sf-gold" /> Add Your Email
              </h3>
              <button onClick={() => setShowEmailPrompt(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Please provide your email address for reporting and communication purposes.
            </p>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveEmail()}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-sm mb-4"
              placeholder="you@safarilink.co.ke"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowEmailPrompt(false)}
                className="px-4 py-2 text-sm text-slate-500 font-medium hover:bg-sf-cream dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Skip for now
              </button>
              <button
                onClick={handleSaveEmail}
                className="px-4 py-2 text-sm bg-sf-brown hover:bg-sf-brown-dark text-white font-medium rounded-lg transition-colors shadow-xs"
              >
                Save Email
              </button>
            </div>
          </div>
        </div>
      )}

      {activeView === "bulletin" ? (
        <main className="flex-1 overflow-hidden pt-4 px-4 pb-4">
          <div className="h-full overflow-y-auto">
            <BulletinBoard
              isAdmin={isAdmin}
              activeUserId={user.id}
              departments={departments}
              documents={documents}
              onSelectDepartment={(deptId) => {
                setActiveDepartmentId(deptId);
                setActiveView("manuals");
                setActiveDocId(null);
              }}
              onSelectDoc={handleSelectDoc}
            />
          </div>
        </main>
      ) : activeView === "training" ? (
        <TrainingView
          isAdmin={isAdmin}
          userId={user.id}
          displayName={user.displayName}
          currentRole={user.role}
          departments={departments}
        />
      ) : (
        <main className="flex-1 flex overflow-hidden min-h-0 pt-4 px-4 pb-4 gap-4">
          {/* Desktop Sidebar */}
          <div className="hidden sm:block">
            <Sidebar
              documents={documents}
              activeDocId={viewingOverallAnalytics || viewingDueDates ? null : activeDocId}
              currentRole={user.role}
              tracking={tracking}
              activeUserId={user.id}
              onSelectDoc={handleSelectDoc}
              onCreateDoc={() => setShowNewDoc(true)}
              onReorder={handleReorder}
              onTrash={handleTrashDoc}
              onEditDueDate={handleEditDueDate}
              searchQuery={searchQuery}
              departments={departments}
              activeDepartmentId={activeDepartmentId}
              onSelectDepartment={(id) => {
                setActiveDepartmentId(id);
                setActiveDocId(null);
              }}
            />
          </div>

          {/* Main content */}
          <section className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Mobile: always-visible manual switcher */}
            <div className="sm:hidden bg-white dark:bg-slate-900 border-b border-sf-cream-dark dark:border-slate-700 shrink-0">
              {departments.length > 0 && (
                <div className="flex gap-1.5 px-3 pt-2 pb-1.5 overflow-x-auto scrollbar-none">
                  <button
                    onClick={() => { setActiveDepartmentId(null); setActiveDocId(null); }}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors shrink-0",
                      activeDepartmentId === null
                        ? "bg-sf-brown text-white"
                        : "bg-sf-cream dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                    )}
                  >
                    All
                  </button>
                  {departments.map((dept) => (
                    <button
                      key={dept.id}
                      onClick={() => { setActiveDepartmentId(dept.id); setActiveDocId(null); }}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0",
                        activeDepartmentId === dept.id
                          ? "text-white"
                          : "bg-sf-cream dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                      )}
                      style={activeDepartmentId === dept.id ? { backgroundColor: dept.color } : undefined}
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dept.color }} />
                      {dept.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-2 px-3 pb-2.5 overflow-x-auto scrollbar-none">
                {documents
                  .filter((doc) => !activeDepartmentId || doc.departmentId === activeDepartmentId)
                  .map((doc) => {
                    const totalSec = doc.sections.length;
                    let readSec = 0;
                    doc.sections.forEach((s) => { if (tracking[s.id]) readSec++; });
                    const pct = totalSec > 0 ? Math.round((readSec / totalSec) * 100) : 0;
                    const isActive = activeDocId === doc.id && !viewingOverallAnalytics && !viewingDueDates;

                    return (
                      <button
                        key={doc.id}
                        onClick={() => handleSelectDoc(doc.id)}
                        className={cn(
                          "w-40 shrink-0 rounded-xl border px-3 py-2 text-left transition-all",
                          isActive
                            ? "bg-sf-brown text-white border-sf-brown shadow-sm"
                            : "bg-white dark:bg-slate-800 border-sf-cream-dark dark:border-slate-700 hover:border-sf-gold/40"
                        )}
                      >
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: departments.find((d) => d.id === doc.departmentId)?.color || "#999" }}
                          />
                          <span className={cn("flex-1 truncate text-xs font-semibold", isActive ? "text-white" : "text-slate-900 dark:text-slate-100")}>
                            {doc.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={cn("flex-1 h-1 rounded-full overflow-hidden", isActive ? "bg-white/20" : "bg-sf-cream-dark dark:bg-slate-700")}>
                            <div className="h-1 rounded-full bg-sf-gold" style={{ width: `${pct}%` }} />
                          </div>
                          <span className={cn("text-[10px] font-medium tabular-nums shrink-0", isActive ? "text-sf-gold-light" : "text-slate-400")}>
                            {pct}%
                          </span>
                        </div>
                      </button>
                    );
                  })}
                {documents.filter((doc) => !activeDepartmentId || doc.departmentId === activeDepartmentId).length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-3 w-full">No manuals in this department.</p>
                )}
              </div>
            </div>

            {/* Content chrome: hierarchy of breadcrumb → document header → actions */}
            <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-sf-cream-dark dark:border-slate-700">
              {/* Mini strip: dept context (left) + view mode toggles (admin, right) */}
              <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-2 border-b border-sf-cream-dark dark:border-slate-700/60 bg-sf-cream/50 dark:bg-slate-900">
                <div className="flex items-center gap-1.5 min-w-0 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <BookOpen className="w-3.5 h-3.5 text-sf-gold shrink-0" />
                  <span className="hidden sm:inline">Policy Manuals</span>
                  <ChevronRight className="w-3 h-3 shrink-0" />
                  <span className="inline-flex items-center gap-1.5 min-w-0 normal-case text-slate-600 dark:text-slate-300 font-bold truncate">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: departments.find((d) => d.id === activeDepartmentId)?.color || "#94a3b8" }}
                    />
                    {departments.find((d) => d.id === activeDepartmentId)?.name ?? "All Manuals"}
                  </span>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Tip
                      align="right"
                      label="Due Dates"
                      description="Shows compliance deadlines for every manual — which are approaching and which are already overdue."
                    >
                      <button
                        onClick={() => { setViewingDueDates((v) => !v); setViewingOverallAnalytics(false); setViewingReports(false); setViewingTrash(false); }}
                        className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full border text-[11px] sm:text-xs font-semibold transition-colors ${viewingDueDates ? "bg-sf-gold text-sf-brown border-sf-gold" : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-sf-gold/40"}`}
                      >
                        <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden xs:inline">{viewingDueDates ? "Due Dates On" : "Due Dates"}</span>
                      </button>
                    </Tip>
                    <Tip
                      align="right"
                      label={viewingOverallAnalytics ? "Back to Manuals" : "Analytics"}
                      description="Switches to overall readership analytics across every manual and user — completion trends, read counts and staff coverage."
                    >
                      <button
                        onClick={() => { setViewingOverallAnalytics((v) => !v); setViewingReports(false); setViewingDueDates(false); setViewingTrash(false); }}
                        className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full border text-[11px] sm:text-xs font-semibold transition-colors ${viewingOverallAnalytics ? "bg-sf-brown text-white border-sf-brown" : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-sf-gold/40"}`}
                      >
                        <BarChart3 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden xs:inline">{viewingOverallAnalytics ? "Analytics On" : "Analytics"}</span>
                      </button>
                    </Tip>
                    <Tip
                      align="right"
                      label={viewingTrash ? "Close Trash" : "Trash"}
                      description="Browse manuals that were moved to trash and restore them — nothing is permanently deleted from here."
                    >
                      <button
                        onClick={() => { setViewingTrash((v) => !v); setViewingOverallAnalytics(false); setViewingReports(false); setViewingDueDates(false); if (!viewingTrash) loadTrash(); }}
                        className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full border text-[11px] sm:text-xs font-semibold transition-colors ${viewingTrash ? "bg-red-600 text-white border-red-600" : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-red-300"}`}
                      >
                        <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden xs:inline">{viewingTrash ? "Trash Open" : "Trash"}</span>
                      </button>
                    </Tip>
                  </div>
                )}
              </div>

              {/* Document header: title + meta (left) & primary document actions (right) */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3">
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-slate-100 leading-tight truncate">
                    {viewingDueDates
                      ? "Due Dates"
                      : viewingOverallAnalytics
                        ? "Analytics"
                        : viewingTrash
                          ? "Trash"
                          : activeDoc?.title ?? (isAdmin ? "Start building your library" : "Choose a manual to begin reading")}
                  </h1>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {viewingDueDates
                      ? "Compliance deadlines across all manuals."
                      : viewingOverallAnalytics
                        ? "Readership across all manuals and users."
                        : viewingTrash
                          ? "Soft-deleted manuals can be restored here."
                          : docMetaText}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap shrink-0">
                  {isAdmin && !viewingDueDates && !viewingOverallAnalytics && !viewingTrash && (
                    <>
                      <Tip
                        align="right"
                        label="Import / Export"
                        description="Bulk import manuals, departments and users from a JSON backup, or export the current data to take off-site."
                      >
                        <ImportExport onImportComplete={loadDocs} />
                      </Tip>
                      <Tip
                        align="right"
                        label="New Manual"
                        description="Create a brand-new policy manual. Give it a title, due date and department — sections can be added afterwards."
                      >
                        <button
                          onClick={() => setShowNewDoc(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold bg-sf-brown hover:bg-sf-brown-dark text-white rounded-lg transition-colors shadow-xs shrink-0"
                        >
                          <ListPlus className="w-3.5 h-3.5" /> <span className="hidden xs:inline">New</span> Manual
                        </button>
                      </Tip>
                    </>
                  )}
                  {isAdmin && !viewingDueDates && !viewingOverallAnalytics && !viewingTrash && activeDoc && (
                    <>
                      <span className="hidden sm:block w-px h-6 bg-slate-200 dark:bg-slate-700 mx-0.5" />
                      <Tip
                        align="right"
                        label={viewingReports ? "Back to Reader" : "Manual Report"}
                        description="Opens a per-manual report showing which sections each staff member has read, marked complete and their overall completion rate."
                      >
                        <button
                          onClick={() => setViewingReports((v) => !v)}
                          className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg border font-medium transition-colors shrink-0 ${
                            viewingReports
                              ? "bg-sf-gold text-sf-brown border-sf-gold"
                              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-sf-gold/50"
                          }`}
                        >
                          {viewingReports ? (
                            <><BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden xs:inline">Reader</span></>
                          ) : (
                            <><BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden xs:inline">Report</span></>
                          )}
                        </button>
                      </Tip>
                      <Tip
                        align="right"
                        label="Add Section"
                        description="Attach a new block to this manual — rich text, a training video, an embedded PDF, or a PowerPoint slide deck."
                      >
                        <button
                          onClick={() => setShowNewSection(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold bg-sf-brown hover:bg-sf-brown-dark text-white rounded-lg transition-colors shadow-xs shrink-0"
                        >
                          <ListPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden xs:inline">Add Section</span><span className="xs:hidden">Add</span>
                        </button>
                      </Tip>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
                {viewingTrash ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-sf-brown flex items-center gap-2">
                      <Trash2 className="w-5 h-5 text-red-500" /> Trashed Documents
                    </h3>
                    {trashDocs.length === 0 ? (
                      <p className="text-sm text-slate-400 py-8 text-center">Trash is empty.</p>
                    ) : (
                      <div className="space-y-2">
                        {trashDocs.map((td) => (
                          <div key={td.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-sf-cream-dark dark:border-slate-700 rounded-xl">
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{td.title}</p>
                              <p className="text-[11px] text-slate-400">Deleted {new Date(td.deletedAt).toLocaleDateString()}</p>
                            </div>
                            <button
                              onClick={() => handleRestore(td.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-sf-cream hover:bg-sf-cream-dark text-sf-brown rounded-lg border border-sf-cream-dark transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> Restore
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : viewingDueDates ? (
                  <DueDateDashboard />
                ) : showAnalytics && isAdmin ? (
                  <ReportsView
                    documents={documents}
                    tracking={tracking}
                    filterDocument={viewingReports ? activeDoc : null}
                  />
                ) : (
                  <DocumentReader
                    document={activeDoc}
                    currentRole={user.role}
                    tracking={tracking}
                    activeUserId={user.id}
                    onToggleRead={handleToggleRead}
                    onMarkCompleted={handleMarkCompleted}
                    onEditSection={handleEditSection}
                    onViewVersions={(id) => setVersionSectionId(id)}
                  />
                )}
              </div>
          </section>
        </main>
      )}
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}

export default App;
