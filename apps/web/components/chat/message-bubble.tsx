 'use client';

import { useState } from 'react';
import { resolveApiUrl, type TimelineItem } from '../../lib/api';
import { formatClockTime } from './time';

type MessageBubbleProps = {
  item: TimelineItem;
  isOwn: boolean;
};

export function MessageBubble({ item, isOwn }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const hasText = !!item.textContent;
  const isImage = item.type === 'image' && !!item.attachment;
  const isFile = item.type === 'file' && !!item.attachment;
  const isLink = item.type === 'link';
  const isPlainText = item.type === 'text' && hasText;

  async function handleCopy() {
    if (!item.textContent) return;

    await navigator.clipboard.writeText(item.textContent);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={`group/message mb-6 flex w-full sm:mb-8 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      {!isOwn && (
        <div className="mr-3 mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-stone-200 bg-stone-100 text-xs font-semibold text-stone-600">
          {item.device.name.slice(0, 2).toUpperCase()}
        </div>
      )}
      <div className={`flex max-w-[85%] flex-col sm:max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
        <span className={`mb-1.5 text-xs font-medium text-stone-500 ${isOwn ? 'mr-1' : 'ml-1'}`}>
          {item.device.name}
        </span>

        <div
          className={`group relative flex flex-col rounded-2xl ${
            isOwn
              ? 'rounded-tr-sm bg-stone-100 text-stone-900'
              : 'rounded-tl-sm border border-stone-200 bg-white text-stone-900 shadow-sm'
          } ${isImage && !hasText ? 'border-0 bg-transparent p-1 shadow-none' : 'px-4 py-3 sm:px-5 sm:py-4'}`}
        >
          {isImage && (
            <div className={`${hasText ? 'mb-3 mt-1' : ''} overflow-hidden rounded-xl border border-stone-200/50 bg-stone-50`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolveApiUrl(item.attachment!.url)}
                alt={item.attachment!.originalName}
                className="max-h-[400px] w-auto max-w-full object-contain sm:max-h-[500px]"
                loading="lazy"
              />
            </div>
          )}

          {isFile && (
            <a
              href={resolveApiUrl(item.attachment!.url)}
              target="_blank"
              rel="noreferrer"
              className={`mb-1 flex items-center gap-3 rounded-xl p-3 transition-colors ${
                isOwn ? 'bg-white/60 hover:bg-white/80' : 'bg-stone-50 hover:bg-stone-100'
              }`}
            >
              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
                  isOwn
                    ? 'bg-white text-stone-700 shadow-sm'
                    : 'border border-stone-200 bg-white text-stone-700 shadow-sm'
                }`}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  />
                </svg>
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">{item.attachment!.originalName}</span>
                <span className="mt-0.5 text-[11px] text-stone-500">Click to download</span>
              </div>
            </a>
          )}

          {(item.type === 'text' || (isImage && hasText)) && (
            <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed sm:text-base">
              {item.textContent}
            </p>
          )}

          {isLink && (
            <a
              href={item.textContent ?? '#'}
              target="_blank"
              rel="noreferrer"
              className="break-all text-[15px] leading-relaxed underline decoration-stone-400 underline-offset-4 hover:decoration-stone-600 sm:text-base"
            >
              {item.textContent}
            </a>
          )}
        </div>

        <div className={`mt-1.5 flex items-center gap-2 px-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
          {isPlainText && (
            <button
              aria-label={copied ? 'Copied' : 'Copy message'}
              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-stone-400 opacity-0 transition hover:bg-stone-100 hover:text-stone-700 focus-visible:opacity-100 group-hover/message:opacity-100"
              onClick={() => void handleCopy()}
              title={copied ? 'Copied' : 'Copy'}
              type="button"
            >
              {copied ? (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V5a2 2 0 012-2h7a2 2 0 012 2v9a2 2 0 01-2 2h-2m-3 3H7a2 2 0 01-2-2V9a2 2 0 012-2h5a2 2 0 012 2v8a2 2 0 01-2 2z" />
                </svg>
              )}
            </button>
          )}
          <span className="text-[11px] font-medium text-stone-400">
            {formatClockTime(new Date(item.createdAt))}
          </span>
        </div>
      </div>
      {isOwn && (
        <div className="ml-3 mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-stone-900 text-xs font-semibold text-white shadow-sm">
          {item.device.name.slice(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  );
}
