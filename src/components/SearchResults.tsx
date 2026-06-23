import { useState, useEffect } from "react";
import { Search as SearchIcon, X, FileText } from "lucide-react";
import type { PolicyDocument } from "@/types";
import * as api from "@/api";

interface SearchResultsProps {
  query: string;
  onClose: () => void;
  onSelectDoc: (docId: string) => void;
}

export function SearchResults({ query, onClose, onSelectDoc }: SearchResultsProps) {
  const [documents, setDocuments] = useState<PolicyDocument[]>([]);
  const [sections, setSections] = useState<{ section: { id: string; title: string; content: string }; document_id: string; document_title: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setDocuments([]);
      setSections([]);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      const results = await api.search(query);
      setDocuments(results.documents);
      setSections(results.sections);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const stripHtml = (html: string) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 max-h-[70vh] overflow-y-auto">
      <div className="sticky top-0 bg-white dark:bg-slate-800 p-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {loading ? "Searching..." : `${documents.length + sections.length} result${documents.length + sections.length !== 1 ? "s" : ""}`}
        </span>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {!loading && documents.length === 0 && sections.length === 0 && query.trim() && (
        <div className="p-8 text-center text-slate-400">
          <SearchIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No results found for "{query}"</p>
        </div>
      )}

      {documents.length > 0 && (
        <div className="p-2">
          <p className="px-2 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">Documents</p>
          {documents.map((doc) => (
            <button
              key={doc.id}
              onClick={() => { onSelectDoc(doc.id); onClose(); }}
              className="w-full text-left p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-3"
            >
              <FileText className="w-4 h-4 text-sky-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{doc.title}</p>
                <p className="text-xs text-slate-400">{doc.sections.length} sections</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {sections.length > 0 && (
        <div className="p-2">
          <p className="px-2 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">Sections</p>
          {sections.map((item, i) => (
            <button
              key={`${item.document_id}-${item.section.id}-${i}`}
              onClick={() => { onSelectDoc(item.document_id); onClose(); }}
              className="w-full text-left p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.section.title}</p>
              <p className="text-xs text-slate-400 truncate">{stripHtml(item.section.content).slice(0, 100)}</p>
              <p className="text-[10px] text-sky-500 mt-1">in {item.document_title}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
