"use client";

import React, { useEffect, useId, useRef } from "react";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: ModalSize;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

const sizes: Record<ModalSize, string> = {
  sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl",
  xl: "max-w-4xl", full: "max-w-[min(96vw,90rem)]"
};

/** Controlled native dialog. Keep modal state in the calling page. */
export default function Modal({
  open, onOpenChange, title, description, children, footer,
  size = "md", closeOnBackdrop = true, closeOnEscape = true,
  showCloseButton = true, className = ""
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function handleCancel(event: React.SyntheticEvent<HTMLDialogElement>) {
    if (!closeOnEscape) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    onOpenChange(false);
  }

  function handleClick(event: React.MouseEvent<HTMLDialogElement>) {
    if (!closeOnBackdrop || event.target !== event.currentTarget) return;
    const rect = ref.current?.getBoundingClientRect();
    if (rect && (event.clientX < rect.left || event.clientX > rect.right ||
      event.clientY < rect.top || event.clientY > rect.bottom)) onOpenChange(false);
  }

  return (
    <dialog ref={ref} onCancel={handleCancel} onClick={handleClick}
      aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined}
      className={`qs-modal w-[calc(100%-2rem)] ${sizes[size]} max-h-[88vh] overflow-hidden rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/60 ${className}`}>
      <div className="flex max-h-[88vh] flex-col">
        <header className="flex items-start justify-between gap-4 border-b px-6 py-5">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
            {description && <p id={descriptionId} className="mt-1 text-sm text-slate-600">{description}</p>}
          </div>
          {showCloseButton && <button type="button" onClick={() => onOpenChange(false)}
            aria-label="Close dialog" className="rounded-lg px-3 py-1 text-2xl text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">×</button>}
        </header>
        <section className="min-h-0 overflow-y-auto px-6 py-5">{children}</section>
        {footer && <footer className="flex flex-wrap justify-end gap-3 border-t bg-slate-50 px-6 py-4">{footer}</footer>}
      </div>
    </dialog>
  );
}
