import { useState, useCallback, useEffect } from "react";
import type { PolicyDocument, User, Department } from "@/types";
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
import { applyTheme } from "@/themes";
import { ListPlus, BarChart3, BookOpen, Calendar, Mail, X, Trash2, RotateCcw, ChevronDown, Menu, ChevronRight, Search } from "lucide-react";

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
  const [activeView, setActiveView] = useState<"bulletin" | "manuals">("bulletin");
  const [userTheme, setUserTheme] = useState("safari");
  const [showMobileDocDrawer, setShowMobileDocDrawer] = useState(false);
  const [mobileDeptOpen, setMobileDeptOpen] = useState(false);

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

  const handleViewChange = useCallback((view: "bulletin" | "manuals") => {
    setActiveView(view);
    if (view === "bulletin") {
      setActiveDocId(null);
      setViewingReports(false);
      setViewingOverallAnalytics(false);
      setViewingDueDates(false);
      setViewingTrash(false);
      setActiveDepartmentId(null);
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
    async (title: string, content: string) => {
      if (!activeDocId) return;
      await api.createSection(activeDocId, title, content);
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
    async (title: string, content: string) => {
      if (!editingSectionId) return;
      const ok = await api.updateSection(editingSectionId, { title, content });
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
          <div className="w-8 h-8 border-4 border-sf-brown border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p>
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
        initialContent={editingSection?.content ?? ""}
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

          {/* Mobile Document Drawer (overlay) */}
          {showMobileDocDrawer && (
            <div className="fixed inset-0 z-50 sm:hidden">
              <div className="absolute inset-0 bg-black/50" onClick={() => setShowMobileDocDrawer(false)} />
              <div className="absolute inset-y-0 left-0 w-[85vw] max-w-[340px] bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-left">
                {/* Drawer header */}
                <div className="flex items-center justify-between p-4 border-b border-sf-cream-dark dark:border-slate-700">
                  <h3 className="font-bold text-sf-brown dark:text-slate-100 text-sm">Browse Manuals</h3>
                  <button onClick={() => setShowMobileDocDrawer(false)} className="p-1.5 rounded-lg hover:bg-sf-cream dark:hover:bg-slate-800 text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Department filter pills */}
                {departments.length > 0 && (
                  <div className="flex gap-1.5 p-3 overflow-x-auto scrollbar-none border-b border-sf-cream-dark dark:border-slate-700">
                    <button
                      onClick={() => { setActiveDepartmentId(null); }}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0",
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
                        onClick={() => { setActiveDepartmentId(dept.id); }}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0",
                          activeDepartmentId === dept.id
                            ? "text-white"
                            : "bg-sf-cream dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                        )}
                        style={activeDepartmentId === dept.id ? { backgroundColor: dept.color } : undefined}
                      >
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dept.color }} />
                        {dept.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Document list */}
                <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                  {documents
                    .filter((doc) => !activeDepartmentId || doc.departmentId === activeDepartmentId)
                    .map((doc) => {
                      const totalSec = doc.sections.length;
                      let readSec = 0;
                      doc.sections.forEach((s) => { if (tracking[s.id]) readSec++; });
                      const pct = totalSec > 0 ? Math.round((readSec / totalSec) * 100) : 0;
                      const isActive = activeDocId === doc.id;

                      return (
                        <button
                          key={doc.id}
                          onClick={() => { handleSelectDoc(doc.id); setShowMobileDocDrawer(false); }}
                          className={cn(
                            "w-full text-left p-3 rounded-xl border transition-all",
                            isActive
                              ? "bg-sf-cream dark:bg-sf-brown/30 border-sf-gold/40 ring-1 ring-sf-gold/30"
                              : "bg-white dark:bg-slate-800 border-sf-cream-dark dark:border-slate-700 hover:bg-sf-cream dark:hover:bg-slate-700"
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate pr-2">{doc.title}</span>
                            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <span>{totalSec} section{totalSec !== 1 ? "s" : ""}</span>
                            <span className="font-medium text-sf-brown-light dark:text-slate-400">{pct}% read</span>
                          </div>
                          <div className="w-full bg-sf-cream-dark dark:bg-slate-700 rounded-full h-1 mt-1.5 overflow-hidden">
                            <div className="bg-sf-gold h-1 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </button>
                      );
                    })}
                  {documents.filter((doc) => !activeDepartmentId || doc.departmentId === activeDepartmentId).length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-8">No manuals in this department.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Main content */}
          <section className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Mobile: compact top bar with Browse button + dept dropdown */}
            <div className="sm:hidden bg-white dark:bg-slate-900 border-b border-sf-cream-dark dark:border-slate-700 px-4 py-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowMobileDocDrawer(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-sf-brown text-white rounded-lg text-xs font-semibold shrink-0"
                >
                  <Menu className="w-4 h-4" /> Browse
                </button>
                <div className="relative flex-1 min-w-0">
                  <button
                    onClick={() => setMobileDeptOpen(!mobileDeptOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-sf-cream dark:bg-slate-800 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 border border-sf-cream-dark dark:border-slate-700"
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      {activeDepartmentId ? (
                        <>
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: departments.find((d) => d.id === activeDepartmentId)?.color || "#999" }} />
                          {departments.find((d) => d.id === activeDepartmentId)?.name || "Department"}
                        </>
                      ) : "All Departments"}
                    </span>
                    <ChevronDown className={cn("w-3.5 h-3.5 shrink-0 transition-transform", mobileDeptOpen && "rotate-180")} />
                  </button>
                  {mobileDeptOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-xl border border-sf-cream-dark dark:border-slate-700 shadow-xl z-10 overflow-hidden">
                      <button
                        onClick={() => { setActiveDepartmentId(null); setActiveDocId(null); setMobileDeptOpen(false); }}
                        className={cn("w-full text-left px-3 py-2.5 text-xs font-medium border-b border-sf-cream-dark dark:border-slate-700", activeDepartmentId === null ? "bg-sf-cream dark:bg-slate-700 text-sf-brown dark:text-sf-gold" : "text-slate-600 dark:text-slate-400")}
                      >
                        All Departments
                      </button>
                      {departments.map((dept) => (
                        <button
                          key={dept.id}
                          onClick={() => { setActiveDepartmentId(dept.id); setActiveDocId(null); setMobileDeptOpen(false); }}
                          className={cn("w-full text-left px-3 py-2.5 text-xs font-medium flex items-center gap-2", activeDepartmentId === dept.id ? "bg-sf-cream dark:bg-slate-700" : "text-slate-600 dark:text-slate-400")}
                        >
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dept.color }} />
                          {dept.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {activeDoc && (
                <p className="text-[11px] text-slate-400 mt-1.5 truncate px-1">Reading: {activeDoc.title}</p>
              )}
            </div>

            {/* Desktop: Department Tabs */}
            {departments.length > 0 && (
              <div className="hidden sm:block bg-white dark:bg-slate-900 border-b border-sf-cream-dark dark:border-slate-700 px-6 shrink-0">
                <div className="flex gap-0 overflow-x-auto h-12 items-end scrollbar-none">
                  <button
                    onClick={() => { setActiveDepartmentId(null); setActiveDocId(null); }}
                    className={cn(
                      "px-5 h-10 rounded-t-lg text-sm font-semibold transition-all whitespace-nowrap border-b-2 flex items-center gap-2 min-w-[120px] justify-center",
                      activeDepartmentId === null
                        ? "bg-sf-cream dark:bg-slate-800 text-sf-brown dark:text-sf-gold border-sf-gold"
                        : "text-slate-400 dark:text-slate-500 border-transparent hover:text-slate-600 dark:hover:text-slate-300 hover:border-slate-300"
                    )}
                  >
                    All Departments
                  </button>
                  {departments.map((dept) => (
                    <button
                      key={dept.id}
                      onClick={() => { setActiveDepartmentId(dept.id); setActiveDocId(null); }}
                      className={cn(
                        "px-5 h-10 rounded-t-lg text-sm font-semibold transition-all whitespace-nowrap border-b-2 flex items-center gap-2 min-w-[120px] justify-center",
                        activeDepartmentId === dept.id
                          ? "bg-sf-cream dark:bg-slate-800 border-sf-gold"
                          : "text-slate-400 dark:text-slate-500 border-transparent hover:text-slate-600 dark:hover:text-slate-300 hover:border-slate-300"
                      )}
                      style={activeDepartmentId === dept.id ? { color: dept.color } : undefined}
                    >
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dept.color }} />
                      {dept.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Admin toolbar */}
            {isAdmin && (
              <div className="flex items-center gap-1.5 px-4 sm:px-6 py-2.5 sm:py-3 bg-sf-cream dark:bg-slate-900 border-b border-sf-cream-dark dark:border-slate-700 shrink-0 overflow-x-auto scrollbar-none">
                <ImportExport onImportComplete={loadDocs} />
                <button
                  onClick={() => setShowNewDoc(true)}
                  className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium bg-sf-brown hover:bg-sf-brown-dark text-white rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <ListPlus className="w-3.5 h-3.5" /> <span className="hidden xs:inline">New</span> Manual
                </button>
                <div className="flex items-center gap-1 sm:gap-1.5 ml-auto shrink-0">
                  <button
                    onClick={() => { setViewingDueDates((v) => !v); setViewingOverallAnalytics(false); setViewingReports(false); setViewingTrash(false); }}
                    className={`px-2 sm:px-3 py-1.5 rounded-lg border text-[11px] sm:text-xs font-medium transition-colors flex items-center gap-1 ${viewingDueDates ? "bg-sf-gold text-sf-brown border-sf-gold" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"}`}
                  >
                    <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">Due Dates</span><span className="sm:hidden">Dates</span>
                  </button>
                  <button
                    onClick={() => { setViewingOverallAnalytics((v) => !v); setViewingReports(false); setViewingDueDates(false); setViewingTrash(false); }}
                    className={`px-2 sm:px-3 py-1.5 rounded-lg border text-[11px] sm:text-xs font-medium transition-colors flex items-center gap-1 ${viewingOverallAnalytics ? "bg-sf-brown text-white border-sf-brown" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"}`}
                  >
                    <BarChart3 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">{viewingOverallAnalytics ? "Exit" : "Analytics"}</span><span className="sm:hidden">{viewingOverallAnalytics ? "Exit" : "Stats"}</span>
                  </button>
                  <button
                    onClick={() => { setViewingTrash((v) => !v); setViewingOverallAnalytics(false); setViewingReports(false); setViewingDueDates(false); if (!viewingTrash) loadTrash(); }}
                    className={`px-2 sm:px-3 py-1.5 rounded-lg border text-[11px] sm:text-xs font-medium transition-colors flex items-center gap-1 ${viewingTrash ? "bg-red-600 text-white border-red-600" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"}`}
                  >
                    <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">{viewingTrash ? "Close" : "Trash"}</span><span className="sm:hidden">{viewingTrash ? "X" : "Trash"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Content area */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="border-b border-sf-cream-dark dark:border-slate-700 p-4 sm:p-5 flex justify-between items-center bg-sf-cream dark:bg-slate-800 shrink-0 gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-base sm:text-xl font-bold text-slate-900 dark:text-slate-100 truncate">
                    {viewingDueDates
                      ? "Due Dates"
                      : viewingOverallAnalytics
                        ? "Analytics"
                        : activeDoc?.title ?? "Select a document"}
                  </h2>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {viewingDueDates
                      ? "Compliance deadlines."
                      : viewingOverallAnalytics
                        ? "Across all manuals and users."
                        : docMetaText}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 sm:space-x-2 shrink-0">
                  {isAdmin && !viewingOverallAnalytics && !viewingDueDates && activeDoc && (
                    <>
                      <button
                        onClick={() => setShowNewSection(true)}
                        className="bg-sf-brown hover:bg-sf-brown-dark text-white px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg font-medium transition-colors flex items-center gap-1 shadow-xs"
                      >
                        <ListPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Add Section</span><span className="sm:hidden">Add</span>
                      </button>
                      <button
                        onClick={() => setViewingReports((v) => !v)}
                        className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg font-medium border transition-colors flex items-center gap-1 ${
                          viewingReports
                            ? "bg-sf-gold text-sf-brown border-sf-gold"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        {viewingReports ? (
                          <><BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Reader</span></>
                        ) : (
                          <><BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Report</span></>
                        )}
                      </button>
                    </>
                  )}
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
                    onEditSection={handleEditSection}
                    onViewVersions={(id) => setVersionSectionId(id)}
                  />
                )}
              </div>
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
