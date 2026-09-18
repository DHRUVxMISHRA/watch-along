import React from 'react';
import { ToastMessage } from '../types';

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  if (!toast) return null;

  const isError = toast.type === 'error';
  const isInfo = toast.type === 'info';

  const iconName = isError ? 'error' : isInfo ? 'info' : 'check_circle';
  const iconBg = isError
    ? 'bg-error-container/20 text-error'
    : isInfo
    ? 'bg-secondary-container/30 text-secondary'
    : 'bg-tertiary-container/20 text-tertiary';

  return (
    <div
      role="alert"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-container-highest text-on-surface shadow-2xl border border-surface-container-high animate-in fade-in slide-in-from-bottom-5 duration-300 max-w-sm sm:max-w-md"
    >
      <div className={`w-8 h-8 rounded-full ${iconBg} flex items-center justify-center shrink-0`}>
        <span className="material-symbols-outlined text-[18px]">{iconName}</span>
      </div>

      <div className="flex flex-col min-w-0 pr-1 flex-1">
        <span className="font-semibold text-sm leading-tight text-on-surface truncate">
          {toast.title}
        </span>
        <span className="text-xs text-on-surface-variant leading-tight mt-0.5 truncate">
          {toast.description}
        </span>
      </div>

      {toast.actionText && toast.onAction && (
        <button
          onClick={toast.onAction}
          className="px-2.5 py-1 rounded-md bg-surface-container hover:bg-surface-bright text-on-surface text-xs font-medium transition-colors shrink-0"
        >
          {toast.actionText}
        </button>
      )}

      <button
        onClick={onDismiss}
        className="p-1 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-variant transition-colors ml-1 shrink-0"
        title="Dismiss notification"
      >
        <span className="material-symbols-outlined text-[18px]">close</span>
      </button>
    </div>
  );
};
