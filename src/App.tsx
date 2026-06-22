import { useState, useCallback, useEffect } from "react";
import type { UserRole, PolicyDocument, User } from "@/types";
import { loadDocuments, saveDocuments, loadTracking, saveTracking } from "@/store";
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
import { ListPlus, BarChart3, BookOpen } from "lucide-react";

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [documents, setDocuments] = useState<PolicyDocument[]>([]);
  const [tracking, setTracking] = useState<Record<string, boolean>>({});
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [viewingReports, setViewingReports] = useState(false);
  const [viewingOverallAnalytics, setViewingOverallAnalytics] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showNewDoc, setShowNewDoc] = useState(false);
  const [showNewSection, setShowNewSection] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (session) {
      setUser(session);
      setDocuments(loadDocuments());
      setTracking(loadTracking());
    } else {
      setShowAuth(true);
    }
  }, []);

  const persist = useCallback(
    (docs: PolicyDocument[], track: Record<string, boolean>) => {
      saveDocuments(docs);
      saveTracking(track);
    },
    []
  );

  const handleAuth = useCallback(() => {
    const session = getSession();
    if (session) {
      setUser(session);
      setDocuments(loadDocuments());
      setTracking(loadTracking());
      setShowAuth(false);
    }
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    setUser(null);
    setActiveDocId(null);
    setViewingReports(false);
    setShowAuth(true);
  }, []);

  const handleSelectDoc = useCallback((docId: string) => {
    setActiveDocId(docId);
    setViewingReports(false);
    setViewingOverallAnalytics(false);
  }, []);

  const handleToggleRead = useCallback(
    (sectionId: string) => {
      if (!user) return;
      const key = `${user.id}_${sectionId}`;
      const next = { ...tracking };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = true;
      }
      setTracking(next);
      persist(documents, next);
    },
    [user, tracking, documents, persist]
  );

  const handleCreateDoc = useCallback(
    (title: string) => {
      const newDoc: PolicyDocument = {
        id: `doc-${Date.now()}`,
        title,
        sections: [],
      };
      const next = [...documents, newDoc];
      setDocuments(next);
      persist(next, tracking);
      setShowNewDoc(false);
      setActiveDocId(newDoc.id);
    },
    [documents, tracking, persist]
  );

  const handleCreateSection = useCallback(
    (title: string, content: string) => {
      const docIndex = documents.findIndex((d) => d.id === activeDocId);
      if (docIndex === -1) return;

      const newSection = {
        id: `sec-${Date.now()}`,
        title,
        content,
      };
      const next = documents.map((d, i) =>
        i === docIndex ? { ...d, sections: [...d.sections, newSection] } : d
      );
      setDocuments(next);
      persist(next, tracking);
      setShowNewSection(false);
    },
    [documents, activeDocId, tracking, persist]
  );

  const handleEditSection = useCallback((sectionId: string) => {
    setEditingSectionId(sectionId);
  }, []);

  const handleSaveEdit = useCallback(
    (title: string, content: string) => {
      if (!editingSectionId || !activeDocId) return;
      const next = documents.map((doc) => {
        if (doc.id !== activeDocId) return doc;
        return {
          ...doc,
          sections: doc.sections.map((sec) =>
            sec.id === editingSectionId ? { ...sec, title, content } : sec
          ),
        };
      });
      setDocuments(next);
      persist(next, tracking);
      setEditingSectionId(null);
    },
    [editingSectionId, activeDocId, documents, tracking, persist]
  );

  const handleReorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      const next = [...documents];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      setDocuments(next);
      persist(next, tracking);
    },
    [documents, tracking, persist]
  );

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
      if (tracking[`${user.id}_${s.id}`]) read++;
    });
    docMetaText = `Your progress: ${read} of ${total} sections read.`;
  }

  const editingSection = editingSectionId
    ? activeDoc?.sections.find((s) => s.id === editingSectionId) ?? null
    : null;

  const showAnalytics = viewingReports || viewingOverallAnalytics;
  const analyticsDoc = viewingReports ? activeDoc : null;

  return (
    <div className="bg-slate-50 text-slate-800 font-sans h-screen flex flex-col overflow-hidden">
      <Header
        user={user}
        onLogout={handleLogout}
        onOpenSettings={() => setShowSettings(true)}
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

      <main className="flex-1 flex max-w-[1600px] w-full mx-auto p-6 gap-6 overflow-hidden min-h-0">
        <Sidebar
          documents={documents}
          activeDocId={viewingOverallAnalytics ? null : activeDocId}
          currentRole={user.role}
          tracking={tracking}
          activeUserId={user.id}
          onSelectDoc={handleSelectDoc}
          onCreateDoc={() => setShowNewDoc(true)}
          onReorder={handleReorder}
        />

        <section className="flex-1 flex flex-col gap-6 min-h-0">
          {isAdmin && (
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <AdminDashboard documents={documents} tracking={tracking} />
              </div>
              <button
                onClick={() => {
                  setViewingOverallAnalytics((v) => !v);
                  setViewingReports(false);
                }}
                className={`self-center px-4 py-3 rounded-xl border text-sm font-medium transition-colors flex items-center gap-2 shrink-0 ${
                  viewingOverallAnalytics
                    ? "bg-sky-600 text-white border-sky-600"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                {viewingOverallAnalytics ? "Exit Overview" : "Full Analytics"}
              </button>
            </div>
          )}

          <div className="bg-white flex-1 rounded-xl shadow-xs border border-slate-200 flex flex-col min-h-0 overflow-hidden">
            <div className="border-b border-slate-200 p-5 flex justify-between items-center bg-slate-50 rounded-t-xl">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {viewingOverallAnalytics
                    ? "Overall Analytics"
                    : activeDoc?.title ?? "Select a policy document"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {viewingOverallAnalytics
                    ? "Analytics across all policy manuals and users."
                    : docMetaText}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {isAdmin && !viewingOverallAnalytics && (
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
              {showAnalytics && isAdmin ? (
                <ReportsView
                  documents={documents}
                  tracking={tracking}
                  filterDocument={analyticsDoc}
                />
              ) : (
                <DocumentReader
                  document={activeDoc}
                  currentRole={user.role}
                  tracking={tracking}
                  activeUserId={user.id}
                  onToggleRead={handleToggleRead}
                  onEditSection={handleEditSection}
                />
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
