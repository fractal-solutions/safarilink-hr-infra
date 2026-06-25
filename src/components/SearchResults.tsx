import { useState, useEffect } from "react";
import { Search as SearchIcon, X, FileText } from "lucide-react";
import type { PolicyDocument } from "@/types";
import * as api from "@/api";

interface SearchResultsProps {
  query: string;
  onClose: () => void;
  onSelectDoc: (docId: string) => void;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-sf-gold/30 text-sf-brown-dark rounded px-0.5 font-semibold">{part}</mark>
    ) : (
      part
    )
  );
}

function stripHtml(html: string) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

function getSnippet(html: string, query: string, maxLen = 120): React.ReactNode {
  const text = stripHtml(html);
  if (!query.trim()) return text.slice(0, maxLen);
  const lower = text.toLowerCase();
  const qLower = query.toLowerCase();
  const idx = lower.indexOf(qLower);
  if (idx === -1) return text.slice(0, maxLen);
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + query.length + 80);
  const snippet = (start > 0 ? "..." : "") + text.slice(start, end) + (end < text.length ? "..." : "");
  return highlightMatch(snippet, query);
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

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-sf-cream-dark dark:border-slate-700 rounded-xl shadow-xl z-50 max-h-[70vh] overflow-y-auto">
      <div className="sticky top-0 bg-white dark:bg-slate-800 p-3 border-b border-sf-cream-dark dark:border-slate-700 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {loading ? "Searching..." : `${documents.length + sections.length} result${documents.length + sections.length !== 1 ? "s" : ""}`}
        </span>
        <button onClick={onClose} className="p-1 hover:bg-sf-cream dark:hover:bg-slate-700 rounded">
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
              className="w-full text-left p-3 rounded-lg hover:bg-sf-cream dark:hover:bg-slate-700 transition-colors flex items-center gap-3"
            >
              <FileText className="w-4 h-4 text-sf-gold shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{highlightMatch(doc.title, query)}</p>
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
              className="w-full text-left p-3 rounded-lg hover:bg-sf-cream dark:hover:bg-slate-700 transition-colors"
            >
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{highlightMatch(item.section.title, query)}</p>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{getSnippet(item.section.content, query)}</p>
              <p className="text-[10px] text-sf-gold mt-1">in {highlightMatch(item.document_title, query)}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
