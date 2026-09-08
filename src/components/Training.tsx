import { useState, useEffect, useCallback } from "react";
import {
  GraduationCap,
  Plus,
  Building2,
  ChevronRight,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  FileText,
  Video,
  Presentation,
  Type,
  ListChecks,
  PlayCircle,
  X,
} from "lucide-react";
import type { Department, UserRole, CourseDetail, CourseSection, Course, SectionType } from "@/types";
import * as api from "@/api";
import { cn } from "@/lib/utils";
import { SectionFormModal, type SectionFormValues } from "./SectionFormModal";
import { VideoSection } from "./VideoSection";
import { PdfViewer } from "./PdfViewer";
import { useToast } from "./Toast";
import { Tip } from "./Tip";

interface TrainingViewProps {
  isAdmin: boolean;
  userId: string;
  currentRole: UserRole;
  departments: Department[];
}

const TYPE_ICON: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string }> = {
  richtext: { icon: Type, label: "Content" },
  video: { icon: Video, label: "Video" },
  pdf: { icon: FileText, label: "PDF" },
  slides: { icon: Presentation, label: "Presentation" },
  quiz: { icon: ListChecks, label: "Quiz" },
};

export function TrainingView({ isAdmin, userId, currentRole, departments }: TrainingViewProps) {
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [activeCourse, setActiveCourse] = useState<CourseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeDeptId, setActiveDeptId] = useState<string | null>(null);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingSection, setEditingSection] = useState<CourseSection | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadCourses = useCallback(async () => {
    const list = await api.getCourses();
    setCourses(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    const d = await api.getCourseDetail(id);
    setActiveCourse(d);
    setDetailLoading(false);
  }, []);

  const selectCourse = (id: string) => {
    setActiveCourseId(id);
    loadDetail(id);
  };

  const visibleCourses = activeDeptId
    ? courses.filter((c) => c.departmentId === activeDeptId)
    : courses;

  const activeDept = departments.find((d) => d.id === activeDeptId) ?? null;

  const handleSaveCourse = async (data: { title: string; description: string; departmentId: string | null; passmarkPct: number; expiryMonths: string }) => {
    const payload: api.CourseInput = {
      title: data.title,
      description: data.description,
      departmentId: data.departmentId,
      passmarkPct: data.passmarkPct,
      expiryMonths: data.expiryMonths ? Number(data.expiryMonths) : null,
      tiers: [{ min: Math.max(0, Math.min(100, data.passmarkPct)), title: "Pass" }],
    };
    if (editingCourse) {
      const ok = await api.updateCourse(editingCourse.id, payload);
      if (ok) toast("Course updated", "success");
      else toast("Failed to update course", "error");
    } else {
      const created = await api.createCourse(payload);
      if (created) toast("Course created", "success");
      else toast("Failed to create course", "error");
    }
    setShowCourseModal(false);
    setEditingCourse(null);
    await loadCourses();
    if (activeCourseId) await loadDetail(activeCourseId);
  };

  const handleDeleteCourse = async (id: string) => {
    const ok = await api.deleteCourse(id);
    if (ok) {
      toast("Course deleted", "success");
      if (activeCourseId === id) {
        setActiveCourseId(null);
        setActiveCourse(null);
      }
      await loadCourses();
    } else {
      toast("Failed to delete course", "error");
    }
    setConfirmDeleteId(null);
  };

  const handleSaveSection = async (values: SectionFormValues) => {
    if (!activeCourse) return;
    const body = {
      title: values.title,
      type: values.type,
      content: values.content,
      url: values.url,
      originalUrl: values.originalUrl,
      size: values.size,
    };
    if (editingSection) {
      const ok = await api.updateCourseSection(editingSection.id, body);
      if (ok) toast("Section updated", "success");
    } else {
      const ok = await api.createCourseSection(activeCourse.id, body);
      if (ok) toast("Section added", "success");
    }
    setShowSectionModal(false);
    setEditingSection(null);
    await loadDetail(activeCourse.id);
  };

  const handleDeleteSection = async (id: string) => {
    if (!activeCourse) return;
    const ok = await api.deleteCourseSection(id);
    if (ok) {
      toast("Section removed", "success");
      await loadDetail(activeCourse.id);
    }
  };

  const moveSection = async (index: number, dir: -1 | 1) => {
    if (!activeCourse) return;
    const next = [...activeCourse.sections];
    const to = index + dir;
    if (to < 0 || to >= next.length) return;
    [next[index], next[to]] = [next[to], next[index]];
    setActiveCourse({ ...activeCourse, sections: next });
    await api.reorderCourseSections(next.map((s, i) => ({ id: s.id, sort_order: i })));
  };

  const renderBody = (sec: CourseSection) => {
    switch (sec.type) {
      case "video":
        return sec.url ? (
          <VideoSection sectionId={sec.id} url={sec.url} size={sec.size ?? "large"} currentRole={currentRole} isRead={false} onMarkCompleted={() => {}} />
        ) : null;
      case "pdf":
        return sec.url ? <PdfViewer url={sec.url} /> : null;
      case "slides":
        return sec.url
          ? <PdfViewer url={sec.url} fallbackName={sec.originalUrl?.split("/").pop()} />
          : sec.originalUrl
            ? (
              <div className="p-5 text-center text-sm text-slate-500 dark:text-slate-400">
                Preview unavailable —{" "}
                <a href={sec.originalUrl} target="_blank" rel="noreferrer" className="text-sf-brown dark:text-sf-gold font-medium">open the original file</a>.
              </div>
            )
            : null;
      case "quiz":
        return (
          <div className="p-5">
            <div className="rounded-xl border border-dashed border-sf-cream-dark dark:border-slate-600 p-5 text-center text-sm text-slate-400 dark:text-slate-500">
              <ListChecks className="w-8 h-8 mx-auto mb-2 opacity-50" />
              Quiz assessment — available in the next phase.
            </div>
          </div>
        );
      default:
        return (
          <div className="p-5 prose prose-slate dark:prose-invert max-w-none text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            <div dangerouslySetInnerHTML={{ __html: sec.content || "" }} />
          </div>
        );
    }
  };

  return (
    <main className="flex-1 flex overflow-hidden min-h-0 pt-4 px-4 pb-4 gap-4">
      {/* Course library */}
      <div className="hidden sm:flex w-[300px] shrink-0 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-sf-cream-dark dark:border-slate-700/50 p-4 flex-col min-h-0">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-sf-cream-dark dark:border-slate-700/50">
          <h2 className="font-bold text-sf-brown dark:text-slate-100 text-sm tracking-wide uppercase flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-sf-gold" /> Training Courses
          </h2>
          {isAdmin && (
            <button
              onClick={() => { setEditingCourse(null); setShowCourseModal(true); }}
              className="bg-sf-cream hover:bg-sf-cream-dark dark:bg-sf-brown/30 text-sf-brown dark:text-sf-gold p-1.5 rounded-xl border border-sf-cream-dark dark:border-sf-brown-light/30 transition-all hover:shadow-sm"
              aria-label="New Course"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {departments.length > 0 && (
          <div className="pb-3 mb-3 border-b border-sf-cream-dark dark:border-slate-700/50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Department</p>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setActiveDeptId(null)}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold border transition-all",
                  activeDeptId === null ? "bg-sf-brown text-white border-sf-brown shadow-sm" : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-sf-cream-dark dark:border-slate-700 hover:border-sf-gold/40"
                )}
              >
                <Building2 className="w-3 h-3" /> All
              </button>
              {departments.map((dept) => {
                const active = activeDeptId === dept.id;
                return (
                  <button
                    key={dept.id}
                    onClick={() => setActiveDeptId(dept.id)}
                    className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold border transition-all",
                      active ? "text-white border-transparent shadow-sm" : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-sf-cream-dark dark:border-slate-700 hover:border-sf-gold/40"
                    )}
                    style={active ? { backgroundColor: dept.color } : undefined}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: active ? "#fff" : dept.color }} />
                    {dept.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
          {loading ? (
            <p className="text-xs text-slate-400 text-center py-8">Loading courses…</p>
          ) : visibleCourses.length === 0 ? (
            <div className="text-center py-8 px-2">
              <GraduationCap className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                No courses{activeDept ? ` in ${activeDept.name}` : ""} yet
              </p>
              {isAdmin && (
                <button
                  onClick={() => { setEditingCourse(null); setShowCourseModal(true); }}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sf-brown hover:bg-sf-brown-dark text-white text-[11px] font-semibold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Create course
                </button>
              )}
            </div>
          ) : (
            visibleCourses.map((course) => {
              const active = activeCourseId === course.id;
              return (
                <button
                  key={course.id}
                  onClick={() => selectCourse(course.id)}
                  className={cn(
                    "w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex items-start gap-2.5",
                    active
                      ? "bg-sf-cream dark:bg-sf-brown/30 border-sf-gold/40 dark:border-sf-gold/30 ring-1 ring-sf-gold/20 shadow-sm"
                      : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700/50 hover:bg-sf-cream/50 dark:hover:bg-slate-700/50"
                  )}
                >
                  <div className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: course.departmentColor || "#5C3A1E" }}>
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm font-semibold leading-tight truncate", active ? "text-sf-brown dark:text-sf-gold-light" : "text-slate-800 dark:text-slate-100")}>
                      {course.title}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 truncate">
                      {course.sectionCount} section{course.sectionCount === 1 ? "" : "s"}
                      {course.departmentName ? ` · ${course.departmentName}` : " · All departments"}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 mt-1 shrink-0" />
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main course pane */}
      <section className="flex-1 flex flex-col min-h-0 overflow-hidden rounded-2xl border border-sf-cream-dark dark:border-slate-700/50 bg-white dark:bg-slate-900 shadow-sm">
        {activeCourse ? (
          <>
            {/* Header */}
            <div className="shrink-0 border-b border-sf-cream-dark dark:border-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-6 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                    <GraduationCap className="w-3.5 h-3.5 text-sf-gold" />
                    <span>Training</span>
                    <ChevronRight className="w-3 h-3" />
                    <span className="inline-flex items-center gap-1.5 normal-case text-slate-600 dark:text-slate-300 font-bold">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeCourse.departmentColor || "#94a3b8" }} />
                      {activeCourse.departmentName ?? "All Departments"}
                    </span>
                  </div>
                  <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-slate-100 leading-tight">{activeCourse.title}</h1>
                  {activeCourse.description && (
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{activeCourse.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                  {isAdmin && (
                    <>
                      <Tip align="right" label="Edit Course" description="Change the title, description, department, pass mark or certificate validity.">
                        <button
                          onClick={() => { setEditingCourse(activeCourse); setShowCourseModal(true); }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-sf-gold/50 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                      </Tip>
                      <Tip align="right" label="Add Section" description="Add a content block — rich text, video, PDF or a PowerPoint deck.">
                        <button
                          onClick={() => { setEditingSection(null); setShowSectionModal(true); }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-sf-brown hover:bg-sf-brown-dark text-white rounded-lg transition-colors shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Section
                        </button>
                      </Tip>
                      {confirmDeleteId === activeCourse.id ? (
                        <button onClick={() => handleDeleteCourse(activeCourse.id)} className="px-2.5 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg">Delete?</button>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(activeCourse.id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Delete course"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                  {confirmDeleteId === activeCourse.id && (
                    <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-1 text-xs text-slate-500 hover:bg-sf-cream dark:hover:bg-slate-800 rounded-lg">Cancel</button>
                  )}
                </div>
              </div>
            </div>

            {/* Sections */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
              {detailLoading ? (
                <p className="text-sm text-slate-400 text-center py-16">Loading course…</p>
              ) : activeCourse.sections.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-sf-cream-dark dark:border-slate-700 rounded-2xl">
                  <PlayCircle className="w-12 h-12 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">This course has no content yet.</p>
                  {isAdmin && (
                    <p className="text-xs text-slate-400">Use “Add Section” to attach rich text, video, PDF or a presentation.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {activeCourse.sections.map((sec, idx) => {
                    const meta = TYPE_ICON[sec.type] || TYPE_ICON.richtext;
                    const Icon = meta.icon;
                    return (
                      <div key={sec.id} className="rounded-xl border border-sf-cream-dark dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800">
                        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-sf-cream/60 dark:bg-slate-800 border-b border-sf-cream-dark dark:border-slate-700">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sf-gold/15 text-sf-brown-dark dark:text-sf-gold text-[10px] font-bold uppercase tracking-wide">
                              <Icon className="w-3 h-3" /> {meta.label}
                            </span>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{sec.title}</h3>
                          </div>
                          {isAdmin && (
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button onClick={() => moveSection(idx, -1)} disabled={idx === 0} className="p-1 rounded text-slate-400 hover:text-sf-brown disabled:opacity-30 transition-colors"><ArrowUp className="w-3.5 h-3.5" /></button>
                              <button onClick={() => moveSection(idx, 1)} disabled={idx === activeCourse.sections.length - 1} className="p-1 rounded text-slate-400 hover:text-sf-brown disabled:opacity-30 transition-colors"><ArrowDown className="w-3.5 h-3.5" /></button>
                              <button onClick={() => { setEditingSection(sec); setShowSectionModal(true); }} className="p-1 rounded text-slate-400 hover:text-sf-brown dark:hover:text-sf-gold transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleDeleteSection(sec.id)} className="p-1 rounded text-slate-400 hover:text-red-500 transition-colors"><X className="w-3.5 h-3.5" /></button>
                            </div>
                          )}
                        </div>
                        {renderBody(sec)}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-slate-400 dark:text-slate-500">
              <GraduationCap className="w-14 h-14 mx-auto mb-3 text-sf-gold/60" />
              <p className="font-medium text-sm">Select a course from the library</p>
              <p className="text-xs mt-1">Courses follow your department’s policy scope.</p>
            </div>
          </div>
        )}
      </section>

      {/* Course create/edit modal */}
      {showCourseModal && (
        <CourseFormModal
          course={editingCourse}
          departments={departments}
          onClose={() => { setShowCourseModal(false); setEditingCourse(null); }}
          onSave={handleSaveCourse}
        />
      )}

      {/* Section create/edit modal */}
      {showSectionModal && activeCourse && (
        <SectionFormModal
          isOpen={showSectionModal}
          onClose={() => { setShowSectionModal(false); setEditingSection(null); }}
          onSave={handleSaveSection}
          mode={editingSection ? "edit" : "new"}
          initialTitle={editingSection?.title ?? ""}
          initialType={(editingSection?.type as SectionType | undefined) ?? "richtext"}
          initialContent={editingSection?.content ?? ""}
          initialUrl={editingSection?.url ?? null}
          initialOriginalUrl={editingSection?.originalUrl ?? null}
          initialSize={editingSection?.size ?? "large"}
        />
      )}
    </main>
  );
}

function CourseFormModal({ course, departments, onClose, onSave }: {
  course: Course | null;
  departments: Department[];
  onClose: () => void;
  onSave: (data: { title: string; description: string; departmentId: string | null; passmarkPct: number; expiryMonths: string }) => void;
}) {
  const [title, setTitle] = useState(course?.title ?? "");
  const [description, setDescription] = useState(course?.description ?? "");
  const [departmentId, setDepartmentId] = useState<string>(course?.departmentId ?? "");
  const [passmarkPct, setPassmarkPct] = useState(course?.passmarkPct ?? 60);
  const [expiryMonths, setExpiryMonths] = useState(course?.expiryMonths ? String(course.expiryMonths) : "");

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-xs" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg p-6 border border-sf-cream-dark dark:border-slate-700 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-sf-brown dark:text-slate-100 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-sf-gold" /> {course ? "Edit Course" : "New Course"}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border border-sf-cream-dark dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-sm" placeholder="e.g., Customer Service Excellence" autoFocus />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 border border-sf-cream-dark dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-sm resize-none" placeholder="What will trainees learn?" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Department</label>
            <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="w-full px-3 py-2 border border-sf-cream-dark dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-sm">
              <option value="">All departments</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Pass mark (%)</label>
              <input type="number" min={0} max={100} value={passmarkPct} onChange={(e) => setPassmarkPct(Number(e.target.value))} className="w-full px-3 py-2 border border-sf-cream-dark dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Certificate expiry (months)</label>
              <input type="number" min={0} value={expiryMonths} onChange={(e) => setExpiryMonths(e.target.value)} placeholder="None" className="w-full px-3 py-2 border border-sf-cream-dark dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-sm" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-sf-cream-dark dark:border-slate-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 font-medium hover:bg-sf-cream dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
          <button
            onClick={() => onSave({ title: title.trim(), description, departmentId: departmentId || null, passmarkPct: Number(passmarkPct) || 0, expiryMonths })}
            disabled={!title.trim()}
            className="px-4 py-2 text-sm bg-sf-brown hover:bg-sf-brown-dark text-white font-medium rounded-lg transition-colors shadow-xs disabled:opacity-40"
          >
            {course ? "Save Changes" : "Create Course"}
          </button>
        </div>
      </div>
    </div>
  );
}
