'use client';

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as tus from 'tus-js-client';
import { apiFetch, resolveApiUrl, type TimelineItem } from '../lib/api';

type SessionResponse = {
  device: {
    id: number;
    name: string;
  };
};

type TimelineResponse = {
  items: TimelineItem[];
  nextCursor: number | null;
  hasMore: boolean;
};

type UploadState = {
  fileName: string;
  bytesSent: number;
  bytesTotal: number;
};

type MessageNode = {
  kind: 'message';
  key: `message-${number}`;
  item: TimelineItem;
};

type TimeDividerNode = {
  kind: 'time-divider';
  key: `time-divider-${number}`;
  label: string;
  timestamp: string;
};

type ChatRenderNode = MessageNode | TimeDividerNode;

const TUS_CHUNK_SIZE_BYTES = 8 * 1024 * 1024;
const TUS_RETRY_DELAYS_MS = [0, 1000, 3000, 5000];
const TIME_DIVIDER_THRESHOLD_MS = 15 * 60 * 1000;
const WEEKDAY_LABELS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'] as const;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getUploadErrorMessage(error: unknown) {
  if (error instanceof tus.DetailedError) {
    const body = error.originalResponse?.getBody()?.trim();
    if (body) return body;
  }
  if (error instanceof Error) return error.message;
  return '上传失败';
}

function formatClockTime(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function getWeekStart(date: Date) {
  const weekStart = new Date(date);
  const day = weekStart.getDay();
  const diff = day === 0 ? 6 : day - 1;
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - diff);
  return weekStart;
}

function isYesterday(date: Date, now: Date) {
  const yesterday = new Date(now);
  yesterday.setHours(0, 0, 0, 0);
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date, yesterday);
}

function isSameWeek(date: Date, now: Date) {
  return getWeekStart(date).getTime() === getWeekStart(now).getTime();
}

function formatTimeDividerLabel(timestamp: string, now = new Date()) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  const time = formatClockTime(date);

  if (isSameDay(date, now)) {
    return time;
  }

  if (isYesterday(date, now)) {
    return `昨天 ${time}`;
  }

  if (isSameWeek(date, now)) {
    return `${WEEKDAY_LABELS[date.getDay()]} ${time}`;
  }

  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${time}`;
}

function shouldInsertTimeDivider(previousTimestamp: string | null, currentTimestamp: string) {
  if (!previousTimestamp) return true;

  const previousDate = new Date(previousTimestamp);
  const currentDate = new Date(currentTimestamp);

  if (Number.isNaN(previousDate.getTime()) || Number.isNaN(currentDate.getTime())) {
    return true;
  }

  if (!isSameDay(previousDate, currentDate)) {
    return true;
  }

  return currentDate.getTime() - previousDate.getTime() >= TIME_DIVIDER_THRESHOLD_MS;
}

function buildChatRenderNodes(items: TimelineItem[], now = new Date()): ChatRenderNode[] {
  const nodes: ChatRenderNode[] = [];
  let previousTimestamp: string | null = null;

  for (const item of items) {
    if (shouldInsertTimeDivider(previousTimestamp, item.createdAt)) {
      nodes.push({
        kind: 'time-divider',
        key: `time-divider-${item.id}`,
        label: formatTimeDividerLabel(item.createdAt, now),
        timestamp: item.createdAt,
      });
    }

    nodes.push({
      kind: 'message',
      key: `message-${item.id}`,
      item,
    });
    previousTimestamp = item.createdAt;
  }

  return nodes;
}

function TimeDivider({ label }: { label: string }) {
  return (
    <div className="mb-4 flex justify-center sm:mb-6">
      <span className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-medium text-stone-500 sm:px-3.5 sm:text-xs">
        {label}
      </span>
    </div>
  );
}

function MessageBubble({ item, isOwn }: { item: TimelineItem; isOwn: boolean }) {
  const hasText = !!item.textContent;
  const isImage = item.type === 'image' && !!item.attachment;
  const isFile = item.type === 'file' && !!item.attachment;
  const isLink = item.type === 'link';

  return (
    <div className={`flex w-full mb-6 sm:mb-8 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      {!isOwn && (
        <div className="mr-3 mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-stone-100 border border-stone-200 text-xs font-semibold text-stone-600">
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
              ? 'bg-stone-100 text-stone-900 rounded-tr-sm'
              : 'bg-white border border-stone-200 text-stone-900 shadow-sm rounded-tl-sm'
          } ${isImage && !hasText ? 'p-1 bg-transparent border-0 shadow-none' : 'px-4 py-3 sm:px-5 sm:py-4'}`}
        >
          {isImage && (
            <div className={`${hasText ? 'mb-3 mt-1' : ''} overflow-hidden rounded-xl border border-stone-200/50 bg-stone-50`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolveApiUrl(item.attachment!.url)}
                alt={item.attachment!.originalName}
                className="max-h-[400px] sm:max-h-[500px] w-auto max-w-full object-contain"
                loading="lazy"
              />
            </div>
          )}

          {isFile && (
            <a
              href={resolveApiUrl(item.attachment!.url)}
              target="_blank"
              rel="noreferrer"
              className={`flex items-center gap-3 rounded-xl p-3 mb-1 transition-colors ${
                isOwn ? 'bg-white/60 hover:bg-white/80' : 'bg-stone-50 hover:bg-stone-100'
              }`}
            >
              <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${isOwn ? 'bg-white text-stone-700 shadow-sm' : 'bg-white shadow-sm border border-stone-200 text-stone-700'}`}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="truncate text-sm font-medium">{item.attachment!.originalName}</span>
                <span className={`text-[11px] mt-0.5 ${isOwn ? 'text-stone-500' : 'text-stone-500'}`}>点击下载此文件</span>
              </div>
            </a>
          )}

          {(item.type === 'text' || (isImage && hasText)) && (
            <p className="whitespace-pre-wrap break-words text-[15px] sm:text-base leading-relaxed">
              {item.textContent}
            </p>
          )}

          {isLink && (
            <a
              href={item.textContent ?? '#'}
              target="_blank"
              rel="noreferrer"
              className="break-all text-[15px] sm:text-base leading-relaxed underline underline-offset-4 decoration-stone-400 hover:decoration-stone-600"
            >
              {item.textContent}
            </a>
          )}
        </div>

        <div className={`mt-1.5 flex items-center gap-2 px-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-[11px] font-medium text-stone-400">
            {formatClockTime(new Date(item.createdAt))}
          </span>
        </div>

      </div>
      {isOwn && (
        <div className="ml-3 mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-stone-900 text-white text-xs font-semibold shadow-sm">
          {item.device.name.slice(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  );
}

export function ChatClient() {
  const router = useRouter();
  const [deviceName, setDeviceName] = useState('');
  const [deviceId, setDeviceId] = useState<number | null>(null);
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [text, setText] = useState('');
  const [cursor, setCursor] = useState<number | null>(null);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState | null>(null);
  const [error, setError] = useState('');
  
  const timelineRef = useRef<HTMLElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingScrollOffsetRef = useRef<number | null>(null);
  const shouldScrollToBottomRef = useRef(false);

  useEffect(() => {
    async function initialize() {
      try {
        const session = await apiFetch<SessionResponse>('/auth/session');
        setDeviceName(session.device.name);
        setDeviceId(session.device.id);
        const data = await apiFetch<TimelineResponse>('/timeline');
        setItems(data.items);
        setCursor(data.nextCursor);
        setHasMoreHistory(data.hasMore);
        shouldScrollToBottomRef.current = true;
      } catch {
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    }
    void initialize();
  }, [router]);

  useEffect(() => {
    const container = timelineRef.current;
    if (!container) return;

    if (pendingScrollOffsetRef.current !== null) {
      container.scrollTop = container.scrollHeight - pendingScrollOffsetRef.current;
      pendingScrollOffsetRef.current = null;
      return;
    }

    if (shouldScrollToBottomRef.current) {
      container.scrollTop = container.scrollHeight;
      shouldScrollToBottomRef.current = false;
    }
  }, [items]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 192)}px`;
    }
  }, [text]);

  async function refresh() {
    setError('');
    setRefreshing(true);
    try {
      const reset = cursor === null;
      const query = reset ? '' : `?after=${cursor}`;
      const data = await apiFetch<TimelineResponse>(`/timeline${query}`);

      setItems((current) => (reset ? data.items : [...current, ...data.items]));
      setCursor(data.nextCursor);
      if (reset) {
        setHasMoreHistory(data.hasMore);
        shouldScrollToBottomRef.current = true;
      }
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : '刷新失败');
    } finally {
      setRefreshing(false);
    }
  }

  async function loadOlder() {
    if (!hasMoreHistory || items.length === 0) return;

    setError('');
    setLoadingOlder(true);
    const container = timelineRef.current;

    if (container) {
      pendingScrollOffsetRef.current = container.scrollHeight - container.scrollTop;
    }

    try {
      const data = await apiFetch<TimelineResponse>(`/timeline?before=${items[0].id}`);
      setItems((current) => [...data.items, ...current]);
      setHasMoreHistory(data.hasMore);
    } catch (loadOlderError) {
      pendingScrollOffsetRef.current = null;
      setError(loadOlderError instanceof Error ? loadOlderError.message : '加载更早消息失败');
    } finally {
      setLoadingOlder(false);
    }
  }

  function uploadFile(file: File) {
    return new Promise<void>((resolve, reject) => {
      const upload = new tus.Upload(file, {
        endpoint: resolveApiUrl('/uploads'),
        chunkSize: TUS_CHUNK_SIZE_BYTES,
        retryDelays: TUS_RETRY_DELAYS_MS,
        removeFingerprintOnSuccess: true,
        metadata: {
          filename: file.name,
          filetype: file.type || 'application/octet-stream',
        },
        onBeforeRequest(request) {
          const xhr = request.getUnderlyingObject();
          if (xhr && 'withCredentials' in xhr) {
            xhr.withCredentials = true;
          }
        },
        onProgress(bytesSent, bytesTotal) {
          setUploadState({ fileName: file.name, bytesSent, bytesTotal });
        },
        onError(uploadError) {
          reject(uploadError);
        },
        onSuccess() {
          resolve();
        },
      });

      void upload
        .findPreviousUploads()
        .then((previousUploads) => {
          if (previousUploads.length > 0) upload.resumeFromPreviousUpload(previousUploads[0]);
          upload.start();
        })
        .catch(reject);
    });
  }

  async function submitMessage() {
    const value = text.trim();
    if (!value) return;

    setBusy(true);
    setError('');

    try {
      const path = /^https?:\/\//i.test(value) ? '/messages/link' : '/messages/text';
      const key = path.endsWith('/link') ? 'url' : 'text';
      const item = await apiFetch<TimelineItem>(path, {
        method: 'POST',
        body: JSON.stringify({ [key]: value }),
      });

      shouldScrollToBottomRef.current = true;
      setItems((current) => [...current, item]);
      setCursor(item.id);
      setText('');
      
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : '发送失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleSend(event?: FormEvent<HTMLFormElement>) {
    if (event) event.preventDefault();
    await submitMessage();
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setBusy(true);
    setError('');
    setUploadState({ fileName: file.name, bytesSent: 0, bytesTotal: file.size });

    try {
      shouldScrollToBottomRef.current = true;
      await uploadFile(file);
      await refresh();
    } catch (uploadError) {
      setError(getUploadErrorMessage(uploadError));
    } finally {
      setUploadState(null);
      setBusy(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
      router.replace('/login');
    } finally {
      setBusy(false);
    }
  }

  const uploadPercent = uploadState
    ? Math.min(100, Math.round((uploadState.bytesSent / Math.max(uploadState.bytesTotal, 1)) * 100))
    : 0;
  const renderNodes = buildChatRenderNodes(items);

  if (loading) {
    return (
      <main
        className="flex h-[100dvh] items-center justify-center bg-white p-6"
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 1.5rem)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 1.5rem)',
        }}
      >
        <div className="flex flex-col items-center gap-3 text-stone-500">
          <svg className="h-8 w-8 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="text-sm font-medium">正在连接...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-[100dvh] flex-col bg-white">
      {/* Header */}
      <header
        className="flex flex-shrink-0 items-center justify-center border-b border-stone-100 bg-white/90 px-4 py-3 sm:py-4 z-10 backdrop-blur-md"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 0.75rem)' }}
      >
        <div className="flex w-full max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-stone-900 text-white shadow-sm">
              <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-semibold leading-tight text-stone-900">Send to Self</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <p className="text-[11px] sm:text-xs font-medium text-stone-500">当前设备：{deviceName}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 disabled:opacity-50"
              disabled={busy || refreshing || loadingOlder}
              onClick={() => void refresh()}
              type="button"
              title="刷新"
            >
              <svg className={`h-5 w-5 sm:h-5 sm:w-5 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 disabled:opacity-50"
              disabled={busy}
              onClick={() => void handleLogout()}
              type="button"
              title="退出"
            >
              <svg className="h-5 w-5 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Timeline Area */}
      <section
        className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"
        ref={timelineRef}
      >
        <div className="mx-auto flex flex-col w-full max-w-4xl">
          {hasMoreHistory ? (
            <div className="mb-6 sm:mb-8 flex justify-center">
              <button
                className="rounded-full bg-white px-4 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm font-medium text-stone-600 shadow-sm border border-stone-200 transition-colors hover:bg-stone-50 active:scale-95 disabled:opacity-50"
                disabled={loadingOlder || refreshing}
                onClick={() => void loadOlder()}
                type="button"
              >
                {loadingOlder ? '加载中...' : '加载更多历史'}
              </button>
            </div>
          ) : items.length > 0 ? (
            <div className="mb-6 sm:mb-8 flex justify-center">
               <span className="text-[11px] sm:text-xs text-stone-400">没有更多历史消息了</span>
            </div>
          ) : null}

          {items.length === 0 && !hasMoreHistory ? (
            <div className="m-auto flex flex-col items-center justify-center space-y-4 text-center px-4 mt-20">
              <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-stone-50 text-stone-400 border border-stone-100">
                <svg className="h-8 w-8 sm:h-10 sm:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm sm:text-base font-medium text-stone-900">暂无内容</h3>
                <p className="text-xs sm:text-sm text-stone-500">发送第一条消息给自己吧</p>
              </div>
            </div>
          ) : null}

          {renderNodes.map((node) =>
            node.kind === 'time-divider' ? (
              <TimeDivider key={node.key} label={node.label} />
            ) : (
              <MessageBubble key={node.key} item={node.item} isOwn={node.item.device.id === deviceId} />
            ),
          )}
        </div>
      </section>

      {/* Footer / Input Area */}
      <footer
        className="flex-shrink-0 border-t border-stone-100 bg-white/90 backdrop-blur-md p-3 sm:p-4 sm:pb-6 z-10"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}
      >
        <div className="mx-auto flex flex-col w-full max-w-4xl">
          <form className="relative flex items-end gap-2 sm:gap-3" onSubmit={handleSend}>
            <div className="flex flex-shrink-0 gap-1 pb-1 sm:pb-1.5">
              <label className="group cursor-pointer rounded-full p-2 sm:p-2.5 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 disabled:opacity-50" title="上传图片">
                <input accept="image/*" className="hidden" disabled={busy} onChange={(e) => void handleUpload(e)} type="file" />
                <svg className="h-6 w-6 sm:h-7 sm:w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 002 2z" />
                </svg>
              </label>
              <label className="group cursor-pointer rounded-full p-2 sm:p-2.5 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 disabled:opacity-50" title="上传文件">
                <input className="hidden" disabled={busy} onChange={(e) => void handleUpload(e)} type="file" />
                <svg className="h-6 w-6 sm:h-7 sm:w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </label>
            </div>

            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                className="block max-h-48 min-h-[44px] sm:min-h-[52px] w-full resize-none rounded-2xl border border-stone-200 bg-stone-50 py-3 sm:py-3.5 pl-4 pr-4 text-[15px] sm:text-base text-stone-900 placeholder:text-stone-400 focus:border-stone-300 focus:bg-white focus:ring-0 focus:outline-none transition-colors"
                disabled={busy}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!busy && text.trim()) {
                      void submitMessage();
                    }
                  }
                }}
                placeholder="发送消息..."
                rows={1}
                value={text}
              />
            </div>

            <button
              className="flex h-11 w-11 sm:h-[52px] sm:w-[52px] flex-shrink-0 items-center justify-center rounded-full bg-stone-900 text-white transition-transform hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-50"
              disabled={busy || (!text.trim() && !uploadState)}
              type="submit"
              title="发送"
            >
              <svg className="h-5 w-5 sm:h-6 sm:w-6 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>

          {uploadState && (
            <div className="mt-2 flex items-center justify-between px-3 text-xs sm:text-sm text-stone-500">
              <div className="flex items-center gap-2 truncate pr-4">
                <svg className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="truncate">正在上传: {uploadState.fileName}</span>
              </div>
              <span className="flex-shrink-0 font-medium text-stone-700">{uploadPercent}%</span>
            </div>
          )}
          {error && <p className="mt-2 px-3 text-xs sm:text-sm text-red-600">{error}</p>}
        </div>
      </footer>
    </main>
  );
}
