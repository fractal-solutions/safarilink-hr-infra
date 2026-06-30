import { useState, useCallback, useEffect } from "react";
import type { PolicyDocument, User } from "@/types";
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
import { ListPlus, BarChart3, BookOpen, Calendar, Mail, X, Trash2, RotateCcw, Menu, ChevronDown } from "lucide-react";

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
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

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
      <div className="bg-sf-cream dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans h-screen flex flex-col overflow-hidden">
      <Header
        user={user}
        onLogout={handleLogout}
        onOpenSettings={() => setShowSettings(true)}
        isDark={isDark}
        onToggleDark={() => setIsDark((d) => !d)}
        onSearch={handleSearch}
      />

      {/* Mobile sidebar toggle */}
      <div className="sm:hidden px-4 py-2 border-b border-sf-cream-dark dark:border-slate-800">
        <button
          onClick={() => setShowMobileSidebar(!showMobileSidebar)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 rounded-xl border border-sf-cream-dark dark:border-slate-700 text-sm font-medium text-sf-brown dark:text-slate-100 shadow-xs"
        >
          <span className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-sf-gold" />
            {activeDoc?.title || "Browse Policy Manuals"}
          </span>
          <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", showMobileSidebar && "rotate-180")} />
        </button>
        {showMobileSidebar && (
          <div className="mt-2 bg-white dark:bg-slate-800 rounded-xl border border-sf-cream-dark dark:border-slate-700 shadow-lg max-h-[60vh] overflow-y-auto">
            <Sidebar
              documents={documents}
              activeDocId={viewingOverallAnalytics || viewingDueDates ? null : activeDocId}
              currentRole={user.role}
              tracking={tracking}
              activeUserId={user.id}
              onSelectDoc={(id) => { handleSelectDoc(id); setShowMobileSidebar(false); }}
              onCreateDoc={() => { setShowNewDoc(true); setShowMobileSidebar(false); }}
              onReorder={handleReorder}
              onTrash={handleTrashDoc}
              onEditDueDate={handleEditDueDate}
              searchQuery={searchQuery}
              isOpen
              onClose={() => setShowMobileSidebar(false)}
            />
          </div>
        )}
      </div>

      <AuthModal isOpen={false} onAuth={handleAuth} />
      <UserSettings isOpen={showSettings} onClose={() => setShowSettings(false)} currentUser={user} />
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

      <main className="flex-1 flex max-w-[1600px] w-full mx-auto p-6 gap-6 overflow-hidden min-h-0">
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
          />
        </div>

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
                    setViewingTrash(false);
                  }}
                  className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors flex items-center gap-2 ${
                    viewingDueDates
                      ? "bg-sf-gold text-sf-brown border-sf-gold"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-sf-cream dark:hover:bg-slate-700"
                  }`}
                >
                  <Calendar className="w-4 h-4" /> Due Dates
                </button>
                <button
                  onClick={() => {
                    setViewingOverallAnalytics((v) => !v);
                    setViewingReports(false);
                    setViewingDueDates(false);
                    setViewingTrash(false);
                  }}
                  className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors flex items-center gap-2 ${
                    viewingOverallAnalytics
                      ? "bg-sf-brown text-white border-sf-brown"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-sf-cream dark:hover:bg-slate-700"
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  {viewingOverallAnalytics ? "Exit Overview" : "Full Analytics"}
                </button>
                <button
                  onClick={() => {
                    setViewingTrash((v) => !v);
                    setViewingOverallAnalytics(false);
                    setViewingReports(false);
                    setViewingDueDates(false);
                    if (!viewingTrash) loadTrash();
                  }}
                  className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors flex items-center gap-2 ${
                    viewingTrash
                      ? "bg-red-600 text-white border-red-600"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-sf-cream dark:hover:bg-slate-700"
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                  {viewingTrash ? "Close Trash" : "Trash"}
                </button>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 flex-1 rounded-xl shadow-xs border border-sf-cream-dark dark:border-slate-700 flex flex-col min-h-0 overflow-hidden">
            <div className="border-b border-sf-cream-dark dark:border-slate-700 p-5 flex justify-between items-center bg-sf-cream dark:bg-slate-800 rounded-t-xl">
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
                {isAdmin && !viewingOverallAnalytics && !viewingDueDates && activeDoc && (
                  <>
                    <button
                      onClick={() => setShowNewSection(true)}
                      className="bg-sf-brown hover:bg-sf-brown-dark text-white px-3 py-1.5 text-sm rounded-lg font-medium transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <ListPlus className="w-4 h-4" /> Add Section
                    </button>
                    <button
                      onClick={() => setViewingReports((v) => !v)}
                      className={`px-3 py-1.5 text-sm rounded-lg font-medium border transition-colors flex items-center gap-1.5 ${
                        viewingReports
                          ? "bg-sf-gold text-sf-brown border-sf-gold"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-sf-cream dark:hover:bg-slate-700"
                      }`}
                    >
                      {viewingReports ? (
                        <>
                          <BookOpen className="w-4 h-4" /> Reader View
                        </>
                      ) : (
                        <>
                          <BarChart3 className="w-4 h-4" /> Manual Report
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
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
