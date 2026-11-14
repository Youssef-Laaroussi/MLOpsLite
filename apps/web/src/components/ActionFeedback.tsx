import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

type Confirmation = {
  title: string;
  message: string;
  action: string;
  resolve: (confirmed: boolean) => void;
};

const ActionFeedbackContext = createContext<{
  confirmAction: (title: string, message: string, action: string) => Promise<boolean>;
  showSuccess: (message: string) => void;
} | null>(null);

export function useActionFeedback() {
  const feedback = useContext(ActionFeedbackContext);
  if (!feedback) throw new Error("ActionFeedbackProvider is required");
  return feedback;
}

export function ActionFeedbackProvider({ children }: { children: ReactNode }) {
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const pending = useRef<Confirmation | null>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (confirmation && dialog.current && !dialog.current.open) {
      dialog.current.showModal();
      cancelButton.current?.focus();
    }
  }, [confirmation]);

  useEffect(() => () => {
    window.clearTimeout(timer.current);
    pending.current?.resolve(false);
  }, []);

  const confirmAction = (title: string, message: string, action: string) => {
    if (pending.current) return Promise.resolve(false);
    return new Promise<boolean>((resolve) => {
      pending.current = { title, message, action, resolve };
      setConfirmation(pending.current);
    });
  };

  const finish = (confirmed: boolean) => {
    const current = pending.current;
    pending.current = null;
    dialog.current?.close();
    setConfirmation(null);
    current?.resolve(confirmed);
  };

  const showSuccess = (message: string) => {
    window.clearTimeout(timer.current);
    setSuccess(message);
    timer.current = window.setTimeout(() => setSuccess(null), 4000);
  };

  return (
    <ActionFeedbackContext.Provider value={{ confirmAction, showSuccess }}>
      {children}
      <dialog
        ref={dialog}
        aria-labelledby="action-confirm-title"
        aria-describedby="action-confirm-message"
        onCancel={(event) => {
          event.preventDefault();
          finish(false);
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl backdrop:bg-slate-900/45"
      >
        {confirmation && (
          <>
            <div className="flex items-center gap-3">
              <AlertTriangle aria-hidden="true" className="h-5 w-5 shrink-0 text-amber-600" />
              <h2 id="action-confirm-title" className="text-base font-semibold">{confirmation.title}</h2>
            </div>
            <p id="action-confirm-message" className="mt-3 break-words text-sm text-slate-600">{confirmation.message}</p>
            <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              <button ref={cancelButton} type="button" onClick={() => finish(false)} className="rounded-md bg-slate-100 px-3 py-2 text-sm hover:bg-slate-200">
                Cancel
              </button>
              <button type="button" onClick={() => finish(true)} className="rounded-md bg-rose-700 px-3 py-2 text-sm font-medium text-white hover:bg-rose-800">
                {confirmation.action}
              </button>
            </div>
          </>
        )}
      </dialog>
      <div role="status" className="fixed bottom-4 right-4 z-[60] max-w-[calc(100%-2rem)]">
        {success && (
          <div className="flex items-center gap-4 rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-800 shadow-lg">
            <span>{success}</span>
            <button type="button" aria-label="Dismiss message" onClick={() => setSuccess(null)}>×</button>
          </div>
        )}
      </div>
    </ActionFeedbackContext.Provider>
  );
}
