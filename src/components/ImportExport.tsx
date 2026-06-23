import { useState } from "react";
import { Download, Upload } from "lucide-react";
import { exportData, importData } from "@/api";
import { useToast } from "@/components/Toast";

interface ImportExportProps {
  onImportComplete: () => void;
}

export function ImportExport({ onImportComplete }: ImportExportProps) {
  const { toast } = useToast();
  const [importing, setImporting] = useState(false);

  const handleExport = async () => {
    try {
      const data = await exportData();
      if (!data) { toast("Export failed", "error"); return; }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `safarilink-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast("Data exported successfully", "success");
    } catch {
      toast("Export failed", "error");
    }
  };

  const handleImport = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setImporting(true);
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const result = await importData(data);
        if (result?.ok) {
          toast(`Imported ${result.imported?.documents ?? 0} documents`, "success");
          onImportComplete();
        } else {
          toast("Import failed: invalid data", "error");
        }
      } catch {
        toast("Import failed: could not parse file", "error");
      } finally {
        setImporting(false);
      }
    };
    input.click();
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleExport}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-600 transition-colors"
      >
        <Download className="w-3.5 h-3.5" /> Export
      </button>
      <button
        onClick={handleImport}
        disabled={importing}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-600 transition-colors disabled:opacity-50"
      >
        <Upload className="w-3.5 h-3.5" /> {importing ? "Importing..." : "Import"}
      </button>
    </div>
  );
}
