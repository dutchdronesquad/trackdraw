import { DesktopModal } from "@/components/DesktopModal";

export function MapReferenceDialog({ open, onOpenChange }) {
  return (
    <DesktopModal
      open={open}
      onOpenChange={onOpenChange}
      title="Online maps are outside this POC"
    >
      <p>
        Use the browser version to select an online map. The desktop experiment
        tests local editing and project files.
      </p>
    </DesktopModal>
  );
}
