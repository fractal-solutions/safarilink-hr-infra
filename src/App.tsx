import { useState, useCallback, useEffect } from "react";
import type { PolicyDocument, User } from "@/types";
import * as api from "@/api";
import { getSession, logout } from "@/auth";
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
import { ListPlus, BarChart3, BookOpen, Calendar } from "lucide-react";

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

  const loadDocs = useCallback(async () => {
    const docs = await api.getDocuments();
    setDocuments(docs);
  }, []);

  const loadTracking = useCallback(async () => {
    const t = await api.getTracking();
    setTracking(t);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("sf_dark_mode", String(isDark));
  }, [isDark]);

  useEffect(() => {
    (async () => {
      try {
        const session = await getSession();
        if (session) {
          setUser(session);
          await loadDocs();
          await loadTracking();
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
      await loadDocs();
      await loadTracking();
      setShowAuth(false);
      toast("Welcome back!", "success");
    }
  }, [loadDocs, loadTracking, toast]);

  const handleLogout = useCallback(async () => {
    await logout();
    setUser(null);
    setActiveDocId(null);
    setViewingReports(false);
    setShowAuth(true);
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
    async (title: string, dueDate?: string | null, tags?: string[]) => {
      const doc = await api.createDocument(title, dueDate);
      if (doc) {
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

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
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

  let docMetaText = "Choose from the left panel to begin reading.";
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
    <div className="bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans h-screen flex flex-col overflow-hidden">
      <Header
        user={user}
        onLogout={handleLogout}
        onOpenSettings={() => setShowSettings(true)}
        isDark={isDark}
        onToggleDark={() => setIsDark((d) => !d)}
        onSearch={handleSearch}
      />

      <AuthModal isOpen={false} onAuth={handleAuth} />
      <UserSettings isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <NewDocModal
        isOpen={showNewDoc}
        onClose={() => setShowNewDoc(false)}
        onSave={handleCreateDoc}
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

      <main className="flex-1 flex max-w-[1600px] w-full mx-auto p-6 gap-6 overflow-hidden min-h-0">
        <Sidebar
          documents={documents}
          activeDocId={viewingOverallAnalytics || viewingDueDates ? null : activeDocId}
          currentRole={user.role}
          tracking={tracking}
          activeUserId={user.id}
          onSelectDoc={handleSelectDoc}
          onCreateDoc={() => setShowNewDoc(true)}
          onReorder={handleReorder}
          searchQuery={searchQuery}
        />

        <section className="flex-1 flex flex-col gap-6 min-h-0">
          {isAdmin && (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <AdminDashboard documents={documents} />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <ImportExport onImportComplete={loadDocs} />
                <button
                  onClick={() => {
                    setViewingDueDates((v) => !v);
                    setViewingOverallAnalytics(false);
                    setViewingReports(false);
                  }}
                  className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors flex items-center gap-2 ${
                    viewingDueDates
                      ? "bg-amber-600 text-white border-amber-600"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  <Calendar className="w-4 h-4" /> Due Dates
                </button>
                <button
                  onClick={() => {
                    setViewingOverallAnalytics((v) => !v);
                    setViewingReports(false);
                    setViewingDueDates(false);
                  }}
                  className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors flex items-center gap-2 ${
                    viewingOverallAnalytics
                      ? "bg-sky-600 text-white border-sky-600"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  {viewingOverallAnalytics ? "Exit Overview" : "Full Analytics"}
                </button>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 flex-1 rounded-xl shadow-xs border border-slate-200 dark:border-slate-700 flex flex-col min-h-0 overflow-hidden">
            <div className="border-b border-slate-200 dark:border-slate-700 p-5 flex justify-between items-center bg-slate-50 dark:bg-slate-800 rounded-t-xl">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {viewingDueDates
                    ? "Due Dates Dashboard"
                    : viewingOverallAnalytics
                      ? "Overall Analytics"
                      : activeDoc?.title ?? "Select a policy document"}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {viewingDueDates
                    ? "Upcoming and overdue compliance deadlines."
                    : viewingOverallAnalytics
                      ? "Analytics across all policy manuals and users."
                      : docMetaText}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {isAdmin && !viewingOverallAnalytics && !viewingDueDates && (
                  <>
                    <button
                      onClick={() => setShowNewSection(true)}
                      className="bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 text-sm rounded-lg font-medium transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <ListPlus className="w-4 h-4" /> Add Section
                    </button>
                    <button
                      onClick={() => setViewingReports((v) => !v)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 text-sm rounded-lg font-medium border border-slate-200 transition-colors flex items-center gap-1.5"
                    >
                      {viewingReports ? (
                        <>
                          <BookOpen className="w-4 h-4" /> Reader View
                        </>
                      ) : (
                        <>
                          <BarChart3 className="w-4 h-4" /> This Manual
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              {viewingDueDates ? (
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
