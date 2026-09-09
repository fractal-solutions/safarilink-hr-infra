import { useState } from "react";
import { X, Plus, Trash2, ListChecks, ImagePlus, Star } from "lucide-react";
import type { QuizQuestion, QuizOption } from "@/types";
import { cn } from "@/lib/utils";

interface QuizEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTitle?: string;
  initialQuestions?: QuizQuestion[];
  onSave: (title: string, questions: QuizQuestion[]) => void;
}

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function emptyOption(): QuizOption {
  return { id: uid(), text: "", correct: false };
}

function emptyQuestion(type: "mcq" | "open"): QuizQuestion {
  return type === "mcq"
    ? { id: uid(), text: "", imageUrl: "", type: "mcq", points: 5, options: [emptyOption(), emptyOption()] }
    : { id: uid(), text: "", imageUrl: "", type: "open", points: 5 };
}

export function QuizEditorModal({ isOpen, onClose, initialTitle = "", initialQuestions = [], onSave }: QuizEditorModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [questions, setQuestions] = useState<QuizQuestion[]>(initialQuestions.length ? initialQuestions : [emptyQuestion("mcq")]);

  if (!isOpen) return null;

  const updateQuestion = (qi: number, patch: Partial<QuizQuestion>) => {
    setQuestions((qs) => qs.map((q, i) => (i === qi ? { ...q, ...patch } : q)));
  };

  const updateOption = (qi: number, oi: number, patch: Partial<QuizOption>) => {
    setQuestions((qs) => qs.map((q, i) => {
      if (i !== qi) return q;
      const options = (q.options ?? []).map((o, j) => (j === oi ? { ...o, ...patch } : o));
      return { ...q, options };
    }));
  };

  const addOption = (qi: number) => {
    setQuestions((qs) => qs.map((q, i) => (i === qi ? { ...q, options: [...(q.options ?? []), emptyOption()] } : q)));
  };

  const removeOption = (qi: number, oi: number) => {
    setQuestions((qs) => qs.map((q, i) => (i === qi ? { ...q, options: (q.options ?? []).filter((_, j) => j !== oi) } : q)));
  };

  const removeQuestion = (qi: number) => setQuestions((qs) => qs.filter((_, i) => i !== qi));

  const canSave = title.trim() && questions.length > 0 && questions.every((q) => {
    if (!q.text.trim()) return false;
    if (q.type === "mcq") {
      const opts = q.options ?? [];
      return opts.length >= 2 && opts.every((o) => o.text.trim()) && opts.some((o) => o.correct);
    }
    return true;
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-xs" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl border border-sf-cream-dark dark:border-slate-700 max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center px-5 py-4 border-b border-sf-cream-dark dark:border-slate-700 shrink-0">
          <h3 className="text-lg font-bold text-sf-brown dark:text-slate-100 flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-sf-gold" /> Quiz Section
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Section Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border border-sf-cream-dark dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-sm" placeholder="e.g., Module 1 Assessment" autoFocus />
          </div>

          {questions.map((q, qi) => (
            <div key={q.id} className="rounded-xl border border-sf-cream-dark dark:border-slate-600 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-sf-brown dark:text-slate-200 uppercase tracking-wide">Question {qi + 1}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateQuestion(qi, { type: q.type === "mcq" ? "open" : "mcq" })}
                    className="px-2 py-1 text-[11px] font-semibold rounded-md bg-sf-cream dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  >
                    {q.type === "mcq" ? "Multiple choice" : "Open-ended"}
                  </button>
                  <button type="button" onClick={() => removeQuestion(qi)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={q.text}
                  onChange={(e) => updateQuestion(qi, { text: e.target.value })}
                  placeholder="Question text…"
                  className="flex-1 px-3 py-2 border border-sf-cream-dark dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-sm"
                />
                <input
                  type="number"
                  min={0}
                  value={q.points}
                  onChange={(e) => updateQuestion(qi, { points: Math.max(0, Number(e.target.value) || 0) })}
                  className="w-20 px-2 py-2 border border-sf-cream-dark dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-sm text-center"
                  title="Points"
                />
              </div>

              <div className="flex items-center gap-2">
                <ImagePlus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={q.imageUrl || ""}
                  onChange={(e) => updateQuestion(qi, { imageUrl: e.target.value })}
                  placeholder="Optional image URL for this question"
                  className="flex-1 px-2.5 py-1.5 border border-sf-cream-dark dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-xs"
                />
              </div>

              {q.type === "mcq" ? (
                <div className="space-y-2">
                  {(q.options ?? []).map((opt, oi) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateOption(qi, oi, { correct: true })}
                        className={cn(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                          opt.correct ? "border-sf-gold bg-sf-gold" : "border-slate-300 dark:border-slate-600 hover:border-sf-gold/50"
                        )}
                        title="Mark as correct answer"
                      >
                        {opt.correct && <Star className="w-2.5 h-2.5 text-white" />}
                      </button>
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => updateOption(qi, oi, { text: e.target.value })}
                        placeholder={`Option ${oi + 1}`}
                        className="flex-1 px-2.5 py-1.5 border border-sf-cream-dark dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-xs"
                      />
                      <button type="button" onClick={() => removeOption(qi, oi)} className="p-1 text-slate-300 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addOption(qi)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-sf-brown dark:text-sf-gold hover:underline"
                  >
                    <Plus className="w-3 h-3" /> Add option
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">Trainees type a free-text answer. It is graded manually by an admin.</p>
              )}
            </div>
          ))}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setQuestions((qs) => [...qs, emptyQuestion("mcq")])}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-sf-brown dark:text-sf-gold bg-sf-cream dark:bg-slate-800 border border-sf-cream-dark dark:border-slate-600 rounded-lg hover:bg-sf-cream-dark transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Multiple choice
            </button>
            <button
              type="button"
              onClick={() => setQuestions((qs) => [...qs, emptyQuestion("open")])}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-sf-brown dark:text-sf-gold bg-sf-cream dark:bg-slate-800 border border-sf-cream-dark dark:border-slate-600 rounded-lg hover:bg-sf-cream-dark transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Open-ended
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-sf-cream-dark dark:border-slate-700 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 font-medium hover:bg-sf-cream dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
          <button
            onClick={() => { onSave(title.trim(), questions); }}
            disabled={!canSave}
            className="px-4 py-2 text-sm bg-sf-brown hover:bg-sf-brown-dark text-white font-medium rounded-lg transition-colors shadow-xs disabled:opacity-40"
          >
            Save Quiz
          </button>
        </div>
      </div>
    </div>
  );
}
