import { X, Type, Video, FileText, Presentation, Upload, Link2, FileCheck2, Download } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { RichTextEditor } from "./RichTextEditor";
import { uploadMedia, type MediaKind } from "@/api";
import type { SectionType, SectionSize } from "@/types";
import { cn } from "@/lib/utils";

export interface SectionFormValues {
  title: string;
  type: SectionType;
  content: string;
  url: string | null;
  originalUrl: string | null;
  size?: SectionSize;
}

interface SectionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (values: SectionFormValues) => void;
  mode: "new" | "edit";
  initialTitle?: string;
  initialType?: SectionType;
  initialContent?: string;
  initialUrl?: string | null;
  initialOriginalUrl?: string | null;
  initialSize?: SectionSize;
}

const SIZE_OPTIONS: { value: SectionSize; label: string; hint: string }[] = [
  { value: "small", label: "Small", hint: "~25%" },
  { value: "medium", label: "Medium", hint: "~50%" },
  { value: "large", label: "Large", hint: "~75%" },
  { value: "full", label: "Full", hint: "Full width" },
];

const TYPE_OPTIONS: { value: SectionType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "richtext", label: "Rich Text", icon: Type },
  { value: "video", label: "Video", icon: Video },
  { value: "pdf", label: "PDF", icon: FileText },
  { value: "slides", label: "Presentation", icon: Presentation },
];

const KIND_BY_TYPE: Record<SectionType, MediaKind | null> = {
  richtext: null,
  video: "video",
  pdf: "pdf",
  slides: "ppt",
};

const ACCEPT_BY_TYPE: Record<SectionType, string> = {
  richtext: "",
  video: "video/mp4,video/webm",
  pdf: "application/pdf",
  slides: ".pptx",
};

export function SectionFormModal({
  isOpen,
  onClose,
  onSave,
  mode,
  initialTitle = "",
  initialType = "richtext",
  initialContent = "",
  initialUrl = null,
  initialOriginalUrl = null,
  initialSize = "large",
}: SectionFormModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [type, setType] = useState<SectionType>(initialType);
  const [content, setContent] = useState(initialContent);
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [originalUrl, setOriginalUrl] = useState<string | null>(initialOriginalUrl);
  const [size, setSize] = useState<SectionSize>(initialSize);
  const [linkMode, setLinkMode] = useState(() => !initialUrl || !initialUrl.startsWith("/uploads/"));
  const [linkValue, setLinkValue] = useState(initialUrl && !initialUrl.startsWith("/uploads/") ? initialUrl : "");
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
      setType(initialType);
      setContent(initialContent);
      setUrl(initialUrl);
      setOriginalUrl(initialOriginalUrl);
      setSize(initialSize);
      setLinkValue(initialUrl && !initialUrl.startsWith("/uploads/") ? initialUrl : "");
      setFileName("");
      setUploading(false);
    }
  }, [isOpen, initialTitle, initialType, initialContent, initialUrl, initialOriginalUrl, initialSize]);

  if (!isOpen) return null;

  const isRichtext = type === "richtext";
  const needsUrl = type === "video" || type === "pdf";
  const fileLabel = type === "video" ? "video file" : type === "pdf" ? "PDF file" : "PowerPoint file";
  const accept = ACCEPT_BY_TYPE[type];

  const canSave =
    !uploading &&
    title.trim().length > 0 &&
    (isRichtext ? content.trim().length > 0 : !!url || !!originalUrl || (type === "video" && linkValue.trim().length > 0));

  const handlePickFile = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setFileName(file.name);
    setUploading(true);
    const kind = KIND_BY_TYPE[type];
    if (!kind) return;
    const result = await uploadMedia(file, kind);
    setUploading(false);
    if (!result) return;
    if (kind === "ppt") {
      setOriginalUrl(result.originalUrl);
      setUrl(result.url);
      if (result.url) setLinkMode(false);
    } else {
      setUrl(result.url);
      setLinkMode(false);
    }
  };

  const handleUseLink = () => {
    const trimmed = linkValue.trim();
    if (!/^https?:\/\//i.test(trimmed)) return;
    setUrl(trimmed);
    setOriginalUrl(null);
  };

  const handleSave = () => {
    if (!canSave) return;
    const trimmedLink = linkValue.trim();
    const effectiveUrl =
      type === "video" && !url && /^https?:\/\//i.test(trimmedLink) ? trimmedLink : url;
    const values: SectionFormValues = {
      title: title.trim(),
      type,
      content: isRichtext ? content.trim() : "",
      url: type === "richtext" ? null : effectiveUrl || null,
      originalUrl: type === "richtext" ? null : originalUrl || null,
      size: type === "video" ? size : "large",
    };
    onSave(values);
  };

  const currentFileUrl = type === "slides" ? originalUrl || url : url;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-3xl p-6 border border-sf-cream-dark dark:border-slate-700 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-sf-brown dark:text-slate-100">
            {mode === "edit" ? "Edit Section Block" : "Add Functional Section Block"}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Section Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TYPE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = type === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setType(opt.value)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors",
                      active
                        ? "bg-sf-brown text-white border-sf-brown dark:bg-sf-brown-dark"
                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-sf-cream-dark dark:border-slate-700 hover:bg-sf-cream dark:hover:bg-slate-800"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Section Header / Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-sf-cream-dark dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-sm"
              placeholder="e.g., Section 1.4: Emergency Cockpit Protocols"
            />
          </div>

          {isRichtext ? (
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Section Content
              </label>
              <RichTextEditor
                key={`${initialContent}`}
                content={content}
                onChange={setContent}
                placeholder="Write your section content here..."
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Use the toolbar to format text, add headings, lists, alignment, and more.
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Section Media
              </label>

              {currentFileUrl && (
                <div className="flex items-center justify-between gap-2 p-3 mb-3 rounded-lg border border-sf-cream-dark dark:border-slate-700 bg-sf-cream dark:bg-slate-800">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileCheck2 className="w-4 h-4 text-sf-brown dark:text-sf-gold shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                        {fileName || currentFileUrl.split("/").pop()}
                      </p>
                      {type === "slides" && !url && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400">
                          Preview conversion unavailable (LibreOffice not found) — readers can download the original.
                        </p>
                      )}
                    </div>
                  </div>
                  {type === "slides" && originalUrl && (
                    <a
                      href={originalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-sf-brown dark:text-sf-gold rounded-md border border-sf-cream-dark dark:border-slate-700 hover:bg-sf-cream dark:hover:bg-slate-700"
                    >
                      <Download className="w-3 h-3" /> Open
                    </a>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handlePickFile}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-sf-cream-dark dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-sf-brown dark:hover:border-sf-gold hover:text-sf-brown dark:hover:text-sf-gold transition-colors disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  {uploading ? "Uploading..." : `Upload ${fileLabel}`}
                </button>
                {type === "video" && (
                  <button
                    type="button"
                    onClick={() => setLinkMode((v) => !v)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-500 hover:text-sf-brown dark:hover:text-sf-gold rounded-lg border border-sf-cream-dark dark:border-slate-700 hover:bg-sf-cream dark:hover:bg-slate-800 transition-colors"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    {linkMode ? "Upload instead" : "Paste a link instead"}
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={accept}
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {type === "video" && linkMode && (
                <div className="mt-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={linkValue}
                      onChange={(e) => setLinkValue(e.target.value)}
                      placeholder="https://youtube.com/watch?v=… or direct .mp4 / .webm URL"
                      className="flex-1 px-3 py-2 border border-sf-cream-dark dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleUseLink}
                      disabled={!linkValue.trim()}
                      className="px-3 py-2 text-xs font-semibold bg-sf-brown hover:bg-sf-brown-dark text-white rounded-lg transition-colors disabled:opacity-40"
                    >
                      Use
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Direct .mp4 / .webm files save reader progress. YouTube/Vimeo links play in an embedded player (resume tracking not available for those).
                  </p>
                </div>
              )}

              {type === "video" && (
                <div className="mt-4">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Player Size
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {SIZE_OPTIONS.map((opt) => {
                      const active = size === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setSize(opt.value)}
                          className={cn(
                            "px-3 py-2 rounded-lg border text-center transition-colors",
                            active
                              ? "bg-sf-brown text-white border-sf-brown dark:bg-sf-brown-dark"
                              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-sf-cream-dark dark:border-slate-700 hover:bg-sf-cream dark:hover:bg-slate-800"
                          )}
                        >
                          <span className="block text-xs font-semibold leading-tight">{opt.label}</span>
                          <span className={cn("block text-[10px] mt-0.5", active ? "text-white/70" : "text-slate-400")}>
                            {opt.hint}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <p className="text-[11px] text-slate-400 mt-2">
                {type === "slides"
                  ? "Upload a .pptx — it is converted to PDF for inline viewing when LibreOffice is available on the server."
                  : needsUrl
                    ? "File is stored on the server and shown inline in this section."
                    : ""}
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 font-medium hover:bg-sf-cream dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="px-4 py-2 text-sm bg-sf-brown hover:bg-sf-brown-dark text-white font-medium rounded-lg transition-colors shadow-xs disabled:opacity-40"
            >
              {mode === "edit" ? "Save Changes" : "Inject Section Block"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
