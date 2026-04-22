'use client';

import type {
  ChangeEventHandler,
  ClipboardEventHandler,
  DragEventHandler,
  FormEvent,
  KeyboardEvent,
  RefObject,
} from 'react';
import { formatBytes } from './attachment-utils';
import type { PendingAttachment, UploadState } from './types';

type ChatComposerProps = {
  text: string;
  busy: boolean;
  canSend: boolean;
  isDragActive: boolean;
  pendingAttachments: PendingAttachment[];
  uploadState: UploadState | null;
  uploadPercent: number;
  error: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  imageInputRef: RefObject<HTMLInputElement | null>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onTextChange: (value: string) => void;
  onSubmit: (event?: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onPaste: ClipboardEventHandler<HTMLTextAreaElement>;
  onImageInputChange: ChangeEventHandler<HTMLInputElement>;
  onFileInputChange: ChangeEventHandler<HTMLInputElement>;
  onRemoveAttachment: (attachmentId: string) => void;
  onDragEnter: DragEventHandler<HTMLDivElement>;
  onDragOver: DragEventHandler<HTMLDivElement>;
  onDragLeave: DragEventHandler<HTMLDivElement>;
  onDrop: DragEventHandler<HTMLDivElement>;
};

export function ChatComposer({
  text,
  busy,
  canSend,
  isDragActive,
  pendingAttachments,
  uploadState,
  uploadPercent,
  error,
  textareaRef,
  imageInputRef,
  fileInputRef,
  onTextChange,
  onSubmit,
  onPaste,
  onImageInputChange,
  onFileInputChange,
  onRemoveAttachment,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
}: ChatComposerProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!busy && canSend) {
        void onSubmit();
      }
    }
  }

  return (
    <footer
      className="z-10 flex-shrink-0 border-t border-stone-100 bg-white/90 p-3 backdrop-blur-md sm:p-4 sm:pb-6"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col">
        <form
          className={`relative rounded-3xl border transition-colors ${
            isDragActive ? 'border-stone-400 bg-stone-50/80' : 'border-transparent'
          }`}
          onSubmit={onSubmit}
        >
          <div
            className="flex flex-col gap-3 rounded-3xl"
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDragOver={onDragOver}
            onDrop={onDrop}
          >
            {pendingAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2 px-3 pt-3 sm:px-4 sm:pt-4">
                {pendingAttachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex max-w-full items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-left"
                  >
                    {attachment.kind === 'image' && attachment.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={attachment.previewUrl}
                        alt={attachment.file.name}
                        className="h-12 w-12 rounded-xl border border-stone-200 object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                          />
                        </svg>
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-stone-900">{attachment.file.name}</p>
                      <p className="text-xs text-stone-500">
                        {attachment.kind === 'image' ? 'Image' : 'File'} · {formatBytes(attachment.file.size)}
                      </p>
                    </div>

                    <button
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-white hover:text-stone-700 disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={busy}
                      onClick={() => onRemoveAttachment(attachment.id)}
                      type="button"
                      title="Remove attachment"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="relative flex items-end gap-2 px-1 pb-1 sm:gap-3 sm:px-2 sm:pb-2">
              <div className="flex flex-shrink-0 gap-1 pb-1 sm:pb-1.5">
                <input
                  ref={imageInputRef}
                  accept="image/*"
                  className="hidden"
                  disabled={busy}
                  multiple
                  onChange={onImageInputChange}
                  type="file"
                />
                <button
                  className="group rounded-full p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 disabled:opacity-50 sm:p-2.5"
                  disabled={busy}
                  onClick={() => imageInputRef.current?.click()}
                  type="button"
                  title="Upload image"
                >
                  <svg className="h-6 w-6 sm:h-7 sm:w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 002 2z"
                    />
                  </svg>
                </button>
                <input
                  ref={fileInputRef}
                  className="hidden"
                  disabled={busy}
                  multiple
                  onChange={onFileInputChange}
                  type="file"
                />
                <button
                  className="group rounded-full p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 disabled:opacity-50 sm:p-2.5"
                  disabled={busy}
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                  title="Upload file"
                >
                  <svg className="h-6 w-6 sm:h-7 sm:w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                    />
                  </svg>
                </button>
              </div>

              <div className="relative flex-1">
                <textarea
                  ref={textareaRef}
                  className="block max-h-48 min-h-[44px] w-full resize-none rounded-2xl border border-stone-200 bg-stone-50 py-3 pl-4 pr-4 text-[15px] text-stone-900 placeholder:text-stone-400 transition-colors focus:border-stone-300 focus:bg-white focus:outline-none focus:ring-0 sm:min-h-[52px] sm:py-3.5 sm:text-base"
                  disabled={busy}
                  onChange={(event) => onTextChange(event.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={onPaste}
                  placeholder={isDragActive ? 'Drop files to attach' : 'Send a message...'}
                  rows={1}
                  value={text}
                />
              </div>

              <button
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-stone-900 text-white transition-transform hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-50 sm:h-[52px] sm:w-[52px]"
                disabled={busy || !canSend}
                type="submit"
                title="Send"
              >
                <svg className="ml-0.5 h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </form>

        {uploadState && (
          <div className="mt-2 flex items-center justify-between px-3 text-xs text-stone-500 sm:text-sm">
            <div className="flex items-center gap-2 truncate pr-4">
              <svg className="h-3 w-3 animate-spin sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="truncate">
                Uploading {uploadState.currentIndex}/{uploadState.totalCount}: {uploadState.fileName}
              </span>
            </div>
            <span className="flex-shrink-0 font-medium text-stone-700">{uploadPercent}%</span>
          </div>
        )}
        {error && <p className="mt-2 px-3 text-xs text-red-600 sm:text-sm">{error}</p>}
      </div>
    </footer>
  );
}
