import { useState, useEffect, useCallback, useMemo } from "react";
import {
  GraduationCap,
  Plus,
  Building2,
  ChevronRight,
  ChevronLeft,
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
  ClipboardCheck,
  CheckCircle2,
  Award,
  Star,
  Send,
  RotateCcw,
} from "lucide-react";
import type {
  Department,
  UserRole,
  CourseDetail,
  CourseSection,
  Course,
  QuizQuestion,
  QuizOption,
} from "@/types";
import * as api from "@/api";
import { cn } from "@/lib/utils";
import { SectionFormModal, type SectionFormValues } from "./SectionFormModal";
import { QuizEditorModal } from "./QuizEditorModal";
import { CertificateModal } from "./CertificateModal";
import { VideoSection } from "./VideoSection";
import { PdfViewer } from "./PdfViewer";
import { useToast } from "./Toast";
import { Tip } from "./Tip";

interface TrainingViewProps {
  isAdmin: boolean;
  userId: string;
  displayName: string;
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

function parseQuestions(sec: CourseSection | undefined): QuizQuestion[] {
  if (!sec || sec.type !== "quiz") return [];
  try {
    const data = JSON.parse(sec.content || "{}");
    return Array.isArray(data.questions) ? data.questions : [];
  } catch {
    return [];
  }
}

function StarRow({ value, onChange, size = "w-4 h-4" }: { value: number; onChange?: (v: number) => void; size?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className={cn("transition-transform", onChange && "hover:scale-125")}
        >
          <Star className={cn(size, n <= value ? "text-sf-gold fill-sf-gold" : "text-slate-300 dark:text-slate-600")} />
        </button>
      ))}
    </span>
  );
}

export function TrainingView({ isAdmin, userId, displayName, currentRole, departments }: TrainingViewProps) {
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

  const [showQuizEditor, setShowQuizEditor] = useState(false);
  const [editingQuizSec, setEditingQuizSec] = useState<CourseSection | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Attempt state
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showGrading, setShowGrading] = useState(false);
  const [grading, setGrading] = useState<api.GradingAttempt[]>([]);
  const [gradingLoading, setGradingLoading] = useState(false);
  const [gradingValues, setGradingValues] = useState<Record<string, string>>({});
  const [certData, setCertData] = useState<{ courseTitle: string; tierTitle: string; pct: number; issuedAt: string; expiresAt: string | null } | null>(null);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingComment, setRatingComment] = useState("");

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
    // reconcile attempt state from fresh data
    if (d) {
      const inProgress = (d.myAttempts ?? []).find((a) => a.status === "in_progress");
      setAttemptId(inProgress ? inProgress.id : null);
    }
  }, []);

  const selectCourse = (id: string) => {
    setActiveCourseId(id);
    setShowGrading(false);
    setAnswers({});
    loadDetail(id);
  };

  const visibleCourses = activeDeptId ? courses.filter((c) => c.departmentId === activeDeptId) : courses;
  const activeDept = departments.find((d) => d.id === activeDeptId) ?? null;

  const myAttempts = activeCourse?.myAttempts ?? [];
  const bestAttempt = useMemo(() => {
    const graded = myAttempts.filter((a) => a.status === "graded" && a.finalPct != null);
    return graded.sort((a, b) => (b.finalPct ?? 0) - (a.finalPct ?? 0))[0] ?? null;
  }, [myAttempts]);
  const hasPendingReview = myAttempts.some((a) => a.status === "submitted");
  const cert = activeCourse?.myCert ?? null;

  const hasQuiz = !!activeCourse?.sections.some((s) => s.type === "quiz");
  const totalQuestions = useMemo(() => {
    if (!activeCourse) return 0;
    return activeCourse.sections
      .filter((s) => s.type === "quiz")
      .reduce((acc, s) => acc + parseQuestions(s).length, 0);
  }, [activeCourse]);

  const answeredCount = Object.keys(answers).length;
  const attemptActive = !!attemptId;

  const answerKey = (sectionId: string, qi: number) => `${sectionId}:${qi}`;

  // ── Course CRUD ──────────────────────────────────────────────
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
      if (ok) toast("Course updated", "success"); else toast("Failed to update course", "error");
    } else {
      const created = await api.createCourse(payload);
      if (created) toast("Course created", "success"); else toast("Failed to create course", "error");
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
      if (activeCourseId === id) { setActiveCourseId(null); setActiveCourse(null); }
      await loadCourses();
    } else toast("Failed to delete course", "error");
    setConfirmDeleteId(null);
  };

  // ── Section CRUD ─────────────────────────────────────────────
  const handleSaveSection = async (values: SectionFormValues) => {
    if (!activeCourse) return;
    const body = { title: values.title, type: values.type, content: values.content, url: values.url, originalUrl: values.originalUrl, size: values.size };
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

  const handleSaveQuiz = async (title: string, questions: QuizQuestion[]) => {
    if (!activeCourse) return;
    const content = JSON.stringify({ questions });
    if (editingQuizSec) {
      const ok = await api.updateCourseSection(editingQuizSec.id, { type: "quiz", title, content });
      if (ok) toast("Quiz updated", "success");
    } else {
      const ok = await api.createCourseSection(activeCourse.id, { type: "quiz", title, content });
      if (ok) toast("Quiz added", "success");
    }
    setShowQuizEditor(false);
    setEditingQuizSec(null);
    await loadDetail(activeCourse.id);
  };

  const handleDeleteSection = async (id: string) => {
    if (!activeCourse) return;
    const ok = await api.deleteCourseSection(id);
    if (ok) { toast("Section removed", "success"); await loadDetail(activeCourse.id); }
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

  // ── Attempt actions ──────────────────────────────────────────
  const startAttempt = async () => {
    if (!activeCourse) return;
    const res = await api.startCourseAttempt(activeCourse.id);
    if (res) {
      setAttemptId(res.attemptId);
      setAnswers({});
      await loadDetail(activeCourse.id);
      toast(res.resumed ? "Attempt resumed" : "Course started", "success");
    }
  };

  const submitAttempt = async () => {
    if (!attemptId || !activeCourse) return;
    const missing = totalQuestions - answeredCount;
    if (missing > 0) {
      toast(`Answer all ${totalQuestions} questions (${missing} left)`, "error");
      return;
    }
    if (!window.confirm("Submit your answers? This attempt can't be edited afterwards.")) return;
    setSubmitting(true);
    const payload = Object.entries(answers).map(([key, value]) => {
      const [sectionId, qi] = key.split(":");
      return { sectionId, questionIndex: Number(qi), answer: value };
    });
    const res = await api.submitCourseAttempt(attemptId, payload);
    setSubmitting(false);
    if (res) {
      setAttemptId(null);
      setAnswers({});
      await loadDetail(activeCourse.id);
      toast("Assessment submitted", "success");
    } else {
      toast("Failed to submit", "error");
    }
  };

  const openGrading = async () => {
    if (!activeCourse) return;
    setShowGrading(true);
    setGradingLoading(true);
    const g = await api.getCourseGrading(activeCourse.id);
    setGrading(g);
    setGradingLoading(false);
  };

  const gradeAnswer = async (answerId: string) => {
    const pts = Number(gradingValues[answerId] ?? "");
    if (!Number.isFinite(pts)) return;
    await api.gradeOpenAnswer(answerId, pts);
    if (activeCourse) {
      const g = await api.getCourseGrading(activeCourse.id);
      setGrading(g);
      await loadDetail(activeCourse.id);
    }
    toast("Answer graded", "success");
  };

  // ── Rating ───────────────────────────────────────────────────
  const saveRating = async () => {
    if (!activeCourse || !ratingStars) return;
    const res = await api.rateCourse(activeCourse.id, ratingStars, ratingComment.trim());
    if (res?.ok) { toast("Thanks for your rating", "success"); await loadDetail(activeCourse.id); }
  };

  const canRate = myAttempts.some((a) => a.status !== "in_progress");

  // ── Render helpers ───────────────────────────────────────────
  const renderContent = (sec: CourseSection) => {
    if (sec.type === "video") {
      return sec.url ? <VideoSection sectionId={sec.id} url={sec.url} size={sec.size ?? "large"} currentRole={currentRole} isRead={false} onMarkCompleted={() => {}} /> : null;
    }
    if (sec.type === "pdf") {
      return sec.url ? <PdfViewer url={sec.url} /> : null;
    }
    if (sec.type === "slides") {
      return sec.url
        ? <PdfViewer url={sec.url} fallbackName={sec.originalUrl?.split("/").pop()} />
        : sec.originalUrl
          ? <div className="p-5 text-center text-sm text-slate-500 dark:text-slate-400">Preview unavailable — <a href={sec.originalUrl} target="_blank" rel="noreferrer" className="text-sf-brown dark:text-sf-gold font-medium">open the original file</a>.</div>
          : null;
    }
    if (sec.type === "richtext") {
      return <div className="p-5 prose prose-slate dark:prose-invert max-w-none text-sm text-slate-600 dark:text-slate-300 leading-relaxed"><div dangerouslySetInnerHTML={{ __html: sec.content || "" }} /></div>;
    }
    return null;
  };

  const renderQuizForm = (sec: CourseSection) => {
    const questions = parseQuestions(sec);
    if (questions.length === 0) {
      return <div className="p-5 text-sm text-slate-400">This quiz has no questions yet.</div>;
    }
    return (
      <div className="p-5 space-y-4">
        {questions.map((q, qi) => {
          const key = answerKey(sec.id, qi);
          const val = answers[key] ?? "";
          return (
            <div key={q.id} className="rounded-xl border border-sf-cream-dark dark:border-slate-600 p-4">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-sf-brown text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">{qi + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {q.text} <span className="text-slate-400 font-normal">({q.points} pts)</span>
                  </p>
                  {q.imageUrl && (
                    <img src={q.imageUrl} alt="" className="mt-2 max-h-52 rounded-lg border border-sf-cream-dark dark:border-slate-600 object-contain" />
                  )}
                  {q.type === "mcq" ? (
                    <div className="mt-2 space-y-1.5">
                      {(q.options ?? []).map((opt: QuizOption) => (
                        <label key={opt.id} className={cn("flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-sm",
                          val === opt.id ? "border-sf-gold bg-sf-gold/10 text-slate-900 dark:text-slate-100" : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-sf-gold/40")}>
                          <input
                            type="radio"
                            name={`q-${sec.id}-${qi}`}
                            value={opt.id}
                            checked={val === opt.id}
                            onChange={() => setAnswers((a) => ({ ...a, [key]: opt.id }))}
                            className="accent-sf-brown"
                          />
                          {opt.text}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <textarea
                      name={`q-${sec.id}-${qi}`}
                      value={val}
                      onChange={(e) => setAnswers((a) => ({ ...a, [key]: e.target.value }))}
                      rows={3}
                      placeholder="Type your answer…"
                      className="mt-2 w-full px-3 py-2 border border-sf-cream-dark dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-sm resize-none"
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderQuizReadonly = (sec: CourseSection) => {
    const questions = parseQuestions(sec);
    return (
      <div className="p-5 space-y-3">
        <p className="text-[11px] text-slate-400 flex items-center gap-1"><ListChecks className="w-3.5 h-3.5" /> {questions.length} question{questions.length === 1 ? "" : "s"} — start the course to answer.</p>
        {questions.map((q, qi) => (
          <div key={q.id} className="rounded-lg border border-sf-cream-dark dark:border-slate-600 p-3">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{qi + 1}. {q.text} <span className="text-slate-400 font-normal">({q.points} pts)</span></p>
            {q.type === "open" && <p className="text-xs text-slate-400 mt-1">Open-ended question</p>}
          </div>
        ))}
      </div>
    );
  };

  const adminSectionControls = (sec: CourseSection, idx: number, total: number) => (
    <div className="flex items-center gap-0.5 shrink-0">
      <button onClick={() => moveSection(idx, -1)} disabled={idx === 0} className="p-1 rounded text-slate-400 hover:text-sf-brown disabled:opacity-30 transition-colors"><ArrowUp className="w-3.5 h-3.5" /></button>
      <button onClick={() => moveSection(idx, 1)} disabled={idx === total - 1} className="p-1 rounded text-slate-400 hover:text-sf-brown disabled:opacity-30 transition-colors"><ArrowDown className="w-3.5 h-3.5" /></button>
      <button
        onClick={() => {
          if (sec.type === "quiz") {
            setEditingQuizSec(sec);
            setShowQuizEditor(true);
          } else {
            setEditingSection(sec);
            setShowSectionModal(true);
          }
        }}
        className="p-1 rounded text-slate-400 hover:text-sf-brown dark:hover:text-sf-gold transition-colors"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => handleDeleteSection(sec.id)} className="p-1 rounded text-slate-400 hover:text-red-500 transition-colors"><X className="w-3.5 h-3.5" /></button>
    </div>
  );

  const renderAttemptStatus = () => {
    if (bestAttempt && cert) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
          <CheckCircle2 className="w-3.5 h-3.5" /> Passed · {bestAttempt.finalPct}%
        </span>
      );
    }
    if (hasPendingReview) {
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300 text-[11px] font-bold">Pending review</span>;
    }
    return null;
  };

  return (
    <main className="flex-1 flex flex-col sm:flex-row overflow-hidden min-h-0 pt-3 px-3 sm:pt-4 sm:px-4 pb-4 gap-3 sm:gap-4">
      {/* Mobile: slim back-to-courses bar once a course is open */}
      {activeCourse && (
        <div className="sm:hidden flex items-center gap-2 shrink-0 bg-white dark:bg-slate-900 rounded-2xl border border-sf-cream-dark dark:border-slate-700/50 px-3 py-2">
          <button
            onClick={() => { setActiveCourseId(null); setActiveCourse(null); setAnswers({}); setShowGrading(false); }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-sf-brown dark:text-sf-gold shrink-0"
          >
            <ChevronLeft className="w-4 h-4" /> Courses
          </button>
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: activeCourse.departmentColor || "#94a3b8" }} />
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate flex-1 text-right">{activeCourse.title}</p>
        </div>
      )}

      {/* Mobile: course selector */}
      <div className={cn(
        "bg-white dark:bg-slate-900 rounded-2xl border border-sf-cream-dark dark:border-slate-700/50 p-2.5 shrink-0",
        activeCourse ? "hidden" : "sm:hidden flex flex-col gap-2 max-h-56"
      )}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold text-sf-brown dark:text-slate-100 text-xs tracking-wide uppercase flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-sf-gold" /> Courses
          </h2>
          {isAdmin && (
            <button
              onClick={() => { setEditingCourse(null); setShowCourseModal(true); }}
              className="p-1.5 rounded-lg bg-sf-cream dark:bg-sf-brown/30 text-sf-brown dark:text-sf-gold border border-sf-cream-dark dark:border-sf-brown-light/30"
              aria-label="New Course"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveDeptId(null)}
            className={cn(
              "px-2.5 py-1 rounded-full text-[11px] font-semibold border whitespace-nowrap flex items-center gap-1 transition-colors",
              activeDeptId === null ? "bg-sf-brown text-white border-sf-brown" : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-sf-cream-dark dark:border-slate-700"
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
                  "px-2.5 py-1 rounded-full text-[11px] font-semibold border whitespace-nowrap flex items-center gap-1 transition-colors",
                  active ? "text-white border-transparent" : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-sf-cream-dark dark:border-slate-700"
                )}
                style={active ? { backgroundColor: dept.color } : undefined}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: active ? "#fff" : dept.color }} />
                {dept.name}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
          {loading ? (
            <p className="text-xs text-slate-400 py-3 w-full text-center">Loading…</p>
          ) : visibleCourses.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 w-full text-center">No courses{activeDept ? " in this department" : ""} yet.</p>
          ) : (
            visibleCourses.map((course) => {
              const active = activeCourseId === course.id;
              return (
                <button
                  key={course.id}
                  onClick={() => selectCourse(course.id)}
                  className={cn(
                    "w-44 shrink-0 rounded-xl border px-3 py-2 text-left transition-all flex items-start gap-2",
                    active
                      ? "bg-sf-brown text-white border-sf-brown shadow-sm"
                      : "bg-white dark:bg-slate-800 border-sf-cream-dark dark:border-slate-700"
                  )}
                >
                  <div className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: course.departmentColor || "#5C3A1E" }}>
                    <GraduationCap className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-xs font-semibold leading-tight truncate", active ? "text-white" : "text-slate-900 dark:text-slate-100")}>{course.title}</p>
                    <p className={cn("text-[10px] mt-0.5 truncate", active ? "text-sf-gold-light/80" : "text-slate-400")}>
                      {course.sectionCount} section{course.sectionCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Desktop course library */}
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
                className={cn("inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold border transition-all",
                  activeDeptId === null ? "bg-sf-brown text-white border-sf-brown shadow-sm" : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-sf-cream-dark dark:border-slate-700 hover:border-sf-gold/40")}
              >
                <Building2 className="w-3 h-3" /> All
              </button>
              {departments.map((dept) => {
                const active = activeDeptId === dept.id;
                return (
                  <button
                    key={dept.id}
                    onClick={() => setActiveDeptId(dept.id)}
                    className={cn("inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold border transition-all",
                      active ? "text-white border-transparent shadow-sm" : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-sf-cream-dark dark:border-slate-700 hover:border-sf-gold/40")}
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
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">No courses{activeDept ? ` in ${activeDept.name}` : ""} yet</p>
              {isAdmin && (
                <button onClick={() => { setEditingCourse(null); setShowCourseModal(true); }} className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sf-brown hover:bg-sf-brown-dark text-white text-[11px] font-semibold transition-colors">
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
                  className={cn("w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex items-start gap-2.5",
                    active ? "bg-sf-cream dark:bg-sf-brown/30 border-sf-gold/40 dark:border-sf-gold/30 ring-1 ring-sf-gold/20 shadow-sm" : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700/50 hover:bg-sf-cream/50 dark:hover:bg-slate-700/50")}
                >
                  <div className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: course.departmentColor || "#5C3A1E" }}>
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm font-semibold leading-tight truncate", active ? "text-sf-brown dark:text-sf-gold-light" : "text-slate-800 dark:text-slate-100")}>{course.title}</p>
                    <p className="text-[11px] text-slate-400 mt-1 truncate flex items-center gap-1">
                      {course.sectionCount} section{course.sectionCount === 1 ? "" : "s"}
                      {course.departmentName ? ` · ${course.departmentName}` : " · All depts"}
                    </p>
                    {(course.ratingCount ?? 0) > 0 && (
                      <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1"><Star className="w-3 h-3 text-sf-gold fill-sf-gold" /> {course.ratingAvg} ({course.ratingCount})</p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 mt-1 shrink-0" />
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main pane */}
      <section className="flex-1 flex flex-col min-h-0 overflow-hidden rounded-2xl border border-sf-cream-dark dark:border-slate-700/50 bg-white dark:bg-slate-900 shadow-sm">
        {activeCourse ? (
          <>
            <div className="shrink-0 border-b border-sf-cream-dark dark:border-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 px-4 py-2.5 sm:px-6 sm:py-4">
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-slate-100 leading-tight">{activeCourse.title}</h1>
                    {renderAttemptStatus()}
                  </div>
                  {activeCourse.description && <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{activeCourse.description}</p>}
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400 flex-wrap">
                    {activeCourse.passmarkPct > 0 && <span>Pass mark {activeCourse.passmarkPct}%</span>}
                    {(activeCourse.ratingCount ?? 0) > 0 && (
                      <span className="flex items-center gap-1"><StarRow value={activeCourse.ratingAvg ?? 0} /> <span>({activeCourse.ratingCount})</span></span>
                    )}
                    {cert && (
                      <button onClick={() => setCertData({ courseTitle: activeCourse.title, tierTitle: cert.tierTitle, pct: cert.pct, issuedAt: cert.issuedAt, expiresAt: cert.expiresAt })} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sf-gold/15 text-sf-brown-dark dark:text-sf-gold border border-sf-gold/30 text-[11px] font-bold hover:bg-sf-gold/25 transition-colors">
                        <Award className="w-3.5 h-3.5" /> View certificate
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 justify-start sm:justify-end overflow-x-auto scrollbar-none flex-nowrap">
                  {/* Admin management */}
                  {isAdmin && !showGrading && (
                    <>
                      <Tip align="right" label="Edit Course" description="Change title, description, department, pass mark or certificate validity.">
                        <button onClick={() => { setEditingCourse(activeCourse); setShowCourseModal(true); }} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-sf-gold/50 transition-colors shrink-0">
                          <Pencil className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Edit</span>
                        </button>
                      </Tip>
                      <Tip align="right" label="Add Section" description="Add rich text, video, PDF, presentation — or build a quiz assessment.">
                        <button onClick={() => { setEditingSection(null); setShowSectionModal(true); }} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-sf-gold/50 transition-colors shrink-0">
                          <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Section</span>
                        </button>
                      </Tip>
                      <Tip align="right" label="Add Quiz" description="Build a quiz section with multiple-choice (with images) and open-ended questions.">
                        <button onClick={() => { setEditingQuizSec(null); setShowQuizEditor(true); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-sf-brown hover:bg-sf-brown-dark text-white rounded-lg transition-colors shadow-xs shrink-0">
                          <ListChecks className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Add Quiz</span>
                        </button>
                      </Tip>
                      {hasQuiz && (
                        <Tip align="right" label="Grade submissions" description="Mark open-ended answers (correct / incorrect / partial points) and release scores & certificates.">
                          <button onClick={openGrading} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-sf-brown dark:text-sf-gold bg-sf-cream dark:bg-slate-800 border border-sf-cream-dark dark:border-slate-700 rounded-lg hover:bg-sf-cream-dark transition-colors shrink-0">
                            <ClipboardCheck className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Grade</span>
                          </button>
                        </Tip>
                      )}
                    </>
                  )}
                  {isAdmin && showGrading && (
                    <button onClick={() => setShowGrading(false)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-sf-gold/50 transition-colors shrink-0">
                      <PlayCircle className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Back to course</span>
                    </button>
                  )}

                  {/* Trainee actions */}
                  {!isAdmin && (
                    <>
                      {attemptActive && (
                        <button onClick={submitAttempt} disabled={submitting} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-sf-gold hover:bg-sf-gold-dark text-sf-brown-dark rounded-lg transition-colors shadow-sm disabled:opacity-50 shrink-0">
                          <Send className="w-3.5 h-3.5" /> {submitting ? "Submitting…" : <><span className="hidden sm:inline">Submit ({answeredCount}/{totalQuestions})</span><span className="sm:hidden">Submit</span></>}
                        </button>
                      )}
                      {!attemptActive && hasQuiz && !hasPendingReview && (
                        <button onClick={startAttempt} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-sf-brown hover:bg-sf-brown-dark text-white rounded-lg transition-colors shadow-xs shrink-0">
                          <PlayCircle className="w-3.5 h-3.5" /> {myAttempts.some((a) => a.status === "graded") ? <><span className="hidden sm:inline">Retake course</span><span className="sm:hidden">Retake</span></> : <><span className="hidden sm:inline">Start course</span><span className="sm:hidden">Start</span></>}
                        </button>
                      )}
                      {!attemptActive && hasQuiz && hasPendingReview && (
                        <button onClick={startAttempt} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-sf-gold/50 transition-colors shrink-0">
                          <RotateCcw className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Retake</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
              {detailLoading ? (
                <p className="text-sm text-slate-400 text-center py-16">Loading…</p>
              ) : showGrading ? (
                <GradingPanel grading={grading} loading={gradingLoading} values={gradingValues} setValues={setGradingValues} onGrade={gradeAnswer} onRefresh={openGrading} />
              ) : activeCourse.sections.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-sf-cream-dark dark:border-slate-700 rounded-2xl">
                  <PlayCircle className="w-12 h-12 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">This course has no content yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Rating after an attempt */}
                  {!isAdmin && canRate && (
                    <div className="rounded-xl border border-sf-cream-dark dark:border-slate-700 p-4 bg-sf-cream/40 dark:bg-slate-800/60">
                      <p className="text-xs font-bold text-sf-brown dark:text-slate-200 uppercase tracking-wide mb-2">Rate this course</p>
                      <div className="flex items-center gap-3 flex-wrap">
                        <StarRow value={ratingStars || activeCourse.myRating?.stars || 0} onChange={setRatingStars} />
                        <input type="text" value={ratingComment} onChange={(e) => setRatingComment(e.target.value)} placeholder="Optional comment…" className="flex-1 min-w-[160px] px-3 py-1.5 border border-sf-cream-dark dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-xs" />
                        <button onClick={saveRating} disabled={!ratingStars} className="px-3 py-1.5 text-xs font-semibold bg-sf-brown hover:bg-sf-brown-dark text-white rounded-lg disabled:opacity-40">Save</button>
                      </div>
                    </div>
                  )}

                  {activeCourse.sections.map((sec, idx) => {
                    const meta = TYPE_ICON[sec.type] || TYPE_ICON.richtext;
                    const Icon = meta.icon;
                    const isQuiz = sec.type === "quiz";
                    return (
                      <div key={sec.id} className="rounded-xl border border-sf-cream-dark dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800">
                        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-sf-cream/60 dark:bg-slate-800 border-b border-sf-cream-dark dark:border-slate-700">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sf-gold/15 text-sf-brown-dark dark:text-sf-gold text-[10px] font-bold uppercase tracking-wide">
                              <Icon className="w-3 h-3" /> {meta.label}
                            </span>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{sec.title}</h3>
                          </div>
                          {isAdmin && !showGrading ? adminSectionControls(sec, idx, activeCourse.sections.length) : null}
                        </div>
                        {isQuiz
                          ? (attemptActive ? renderQuizForm(sec) : renderQuizReadonly(sec))
                          : renderContent(sec)}
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

      {/* Modals */}
      {showCourseModal && (
        <CourseFormModal course={editingCourse} departments={departments} onClose={() => { setShowCourseModal(false); setEditingCourse(null); }} onSave={handleSaveCourse} />
      )}
      {showSectionModal && activeCourse && (
        <SectionFormModal
          isOpen={showSectionModal}
          onClose={() => { setShowSectionModal(false); setEditingSection(null); }}
          onSave={handleSaveSection}
          mode={editingSection ? "edit" : "new"}
          initialTitle={editingSection?.title ?? ""}
          initialType={editingSection?.type as "richtext" | "video" | "pdf" | "slides" | undefined ?? "richtext"}
          initialContent={editingSection?.content ?? ""}
          initialUrl={editingSection?.url ?? null}
          initialOriginalUrl={editingSection?.originalUrl ?? null}
          initialSize={editingSection?.size ?? "large"}
        />
      )}
      {showQuizEditor && activeCourse && (
        <QuizEditorModal
          isOpen={showQuizEditor}
          onClose={() => { setShowQuizEditor(false); setEditingQuizSec(null); }}
          initialTitle={editingQuizSec?.title ?? ""}
          initialQuestions={parseQuestions(editingQuizSec ?? undefined)}
          onSave={handleSaveQuiz}
        />
      )}
      {certData && (
        <CertificateModal cert={certData} displayName={displayName} onClose={() => setCertData(null)} />
      )}
    </main>
  );
}

function GradingPanel({ grading, loading, values, setValues, onGrade, onRefresh }: {
  grading: api.GradingAttempt[];
  loading: boolean;
  values: Record<string, string>;
  setValues: (v: Record<string, string>) => void;
  onGrade: (answerId: string) => void;
  onRefresh: () => void;
}) {
  const pending = grading.filter((a) => a.openPending > 0 || a.status === "submitted");
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-sf-brown dark:text-slate-100 flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-sf-gold" /> Submissions to grade
        </h3>
        <button onClick={onRefresh} className="text-xs font-medium text-slate-500 hover:text-sf-brown px-2 py-1">Refresh</button>
      </div>
      {loading ? (
        <p className="text-sm text-slate-400 text-center py-10">Loading submissions…</p>
      ) : pending.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-10 border border-dashed border-sf-cream-dark dark:border-slate-600 rounded-xl">No open-ended answers awaiting review.</p>
      ) : (
        pending.map((attempt) => (
          <div key={attempt.attemptId} className="rounded-xl border border-sf-cream-dark dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-sf-cream/60 dark:bg-slate-800 border-b border-sf-cream-dark dark:border-slate-700">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{attempt.userName}</p>
                <p className="text-[11px] text-slate-400">Submitted {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : "—"}</p>
              </div>
              <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                attempt.status === "graded" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                {attempt.status === "graded" ? `Graded · ${attempt.finalPct}%` : `${attempt.openPending} open to grade`}
              </span>
            </div>
            <div className="divide-y divide-sf-cream-dark dark:divide-slate-700">
              {attempt.answers
                .filter((a) => a.kind === "open")
                .map((a) => (
                  <div key={a.id} className="px-4 py-3">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{a.sectionTitle} · Question {a.questionIndex + 1}</p>
                    <p className="text-sm text-slate-800 dark:text-slate-100 mt-0.5">{a.question}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-wrap bg-sf-cream dark:bg-slate-800 rounded-lg p-2.5">{a.answer || <span className="italic text-slate-400">(no answer)</span>}</p>
                    {a.points !== null ? (
                      <p className="text-xs mt-1.5 font-bold text-emerald-600">Marked {a.points}/{a.maxPoints} pts</p>
                    ) : (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-xs text-slate-500">Award (0–{a.maxPoints}):</span>
                        <input
                          type="number"
                          min={0}
                          max={a.maxPoints}
                          value={values[a.id] ?? ""}
                          onChange={(e) => setValues({ ...values, [a.id]: e.target.value })}
                          className="w-24 px-2 py-1 border border-sf-cream-dark dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-sf-gold"
                        />
                        <button onClick={() => onGrade(a.id)} disabled={values[a.id] === undefined || values[a.id] === ""} className="px-3 py-1 text-xs font-semibold bg-sf-brown hover:bg-sf-brown-dark text-white rounded-lg disabled:opacity-40">Grade</button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ))
      )}
    </div>
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
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border border-sf-cream-dark dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-sm" autoFocus />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 border border-sf-cream-dark dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-sm resize-none" />
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
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Cert expiry (months)</label>
              <input type="number" min={0} value={expiryMonths} onChange={(e) => setExpiryMonths(e.target.value)} placeholder="None" className="w-full px-3 py-2 border border-sf-cream-dark dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-sm" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-sf-cream-dark dark:border-slate-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 font-medium hover:bg-sf-cream dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
          <button onClick={() => onSave({ title: title.trim(), description, departmentId: departmentId || null, passmarkPct: Number(passmarkPct) || 0, expiryMonths })} disabled={!title.trim()} className="px-4 py-2 text-sm bg-sf-brown hover:bg-sf-brown-dark text-white font-medium rounded-lg transition-colors shadow-xs disabled:opacity-40">
            {course ? "Save Changes" : "Create Course"}
          </button>
        </div>
      </div>
    </div>
  );
}
