import { SectionFormModal, type SectionFormValues } from "./SectionFormModal";
import type { SectionSize } from "@/types";

interface EditSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (values: SectionFormValues) => void;
  initialTitle: string;
  initialType?: string;
  initialContent: string;
  initialUrl?: string | null;
  initialOriginalUrl?: string | null;
  initialSize?: SectionSize;
}

export function EditSectionModal({
  isOpen,
  onClose,
  onSave,
  initialTitle,
  initialType = "richtext",
  initialContent,
  initialUrl = null,
  initialOriginalUrl = null,
  initialSize = "large",
}: EditSectionModalProps) {
  return (
    <SectionFormModal
      isOpen={isOpen}
      onClose={onClose}
      onSave={onSave}
      mode="edit"
      initialTitle={initialTitle}
      initialType={(initialType as SectionFormValues["type"]) || "richtext"}
      initialContent={initialContent}
      initialUrl={initialUrl}
      initialOriginalUrl={initialOriginalUrl}
      initialSize={initialSize}
    />
  );
}
