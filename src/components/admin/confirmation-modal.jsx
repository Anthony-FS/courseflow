import { X } from "lucide-react";

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmation",
  message = "Are you sure you want to delete this lesson?",
  confirmText = "Yes, I want to delete this lesson",
  cancelText = "No, keep it",
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#F1F2F6]">
          <h3 className="text-lg font-bold text-[#2A2E3F]">{title}</h3>
          <button
            onClick={onClose}
            className="text-[#9AA1B9] hover:text-[#2A2E3F] transition-colors p-1 rounded-lg hover:bg-[#F6F7FC]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-sm text-[#646D89]">{message}</p>
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-2">
          <button
            type="button"
            onClick={onConfirm}
            className="px-5 py-2.5 rounded-xl border border-[#F47E20] text-[#F47E20] font-bold text-sm hover:bg-[#FFF7F0] transition-colors cursor-pointer"
          >
            {confirmText}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#2F5FAC] text-white font-bold text-sm hover:bg-[#234781] transition-colors cursor-pointer shadow-sm"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}
