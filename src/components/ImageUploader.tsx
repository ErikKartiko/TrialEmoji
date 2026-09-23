"use client";

import { CloudUpload, RefreshCw, Trash2 } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";

interface ImageUploaderProps {
  id: string;
  label: string;
  hint?: string;
  value: string | null;
  fileName?: string | null;
  tone: "original" | "reconstruction";
  onFile: (file: File) => void;
  onClear: () => void;
  disabled?: boolean;
}

export function ImageUploader({
  id,
  label,
  hint,
  value,
  fileName,
  tone,
  onFile,
  onClear,
  disabled,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = event.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  const accentClasses =
    tone === "original"
      ? "border-[var(--accent)]/50 bg-[var(--accent)]/6"
      : "border-emerald-500/50 bg-emerald-500/6";

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <label
          htmlFor={id}
          className="text-xs font-semibold tracking-[0.14em] text-[var(--ink)] uppercase"
        >
          {label}
        </label>
        {hint && <span className="text-[11px] text-[var(--ink-soft)]">{hint}</span>}
      </div>

      {value ? (
        <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
          <div className="checker flex aspect-square items-center justify-center p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt={label}
              className="max-h-full max-w-full object-contain drop-shadow-md"
            />
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-[var(--line)] px-3.5 py-2.5">
            <span className="truncate font-mono text-[11px] text-[var(--ink-soft)]">
              {fileName ?? "image"}
            </span>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={disabled}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--ink-soft)] transition hover:bg-[var(--paper-2)] hover:text-[var(--ink)] disabled:opacity-50"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                Replace
              </button>
              <button
                type="button"
                onClick={onClear}
                disabled={disabled}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          disabled={disabled}
          className={`group flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
            dragging ? accentClasses : "border-[var(--line-strong)] bg-white hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/4"
          }`}
        >
          <span
            className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 ${
              tone === "original"
                ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                : "bg-emerald-500/10 text-emerald-600"
            }`}
          >
            <CloudUpload className="h-7 w-7" aria-hidden />
          </span>
          <span className="px-6 text-center">
            <span className="block text-sm font-semibold text-[var(--ink)]">
              {dragging ? "Drop the image here" : "Drag & drop the image"}
            </span>
            <span className="mt-1 block text-xs text-[var(--ink-soft)]">
              or click to browse — PNG, JPG, JPEG, WEBP up to 10 MB
            </span>
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
