import { SectionFormModal, type SectionFormValues } from "./SectionFormModal";

interface NewSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (values: SectionFormValues) => void;
}

export function NewSectionModal({ isOpen, onClose, onSave }: NewSectionModalProps) {
  return (
    <SectionFormModal
      isOpen={isOpen}
      onClose={onClose}
      onSave={onSave}
      mode="new"
    />
  );
}
