'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, type TimelineItem } from '../lib/api';
import { getUploadErrorMessage } from './chat/attachment-utils';
import { ChatComposer } from './chat/chat-composer';
import { MessageBubble } from './chat/message-bubble';
import { buildChatRenderNodes } from './chat/time';
import { TimeDivider } from './chat/time-divider';
import type { SessionResponse, TimelineResponse, UploadState } from './chat/types';
import { uploadFile } from './chat/upload';
import { usePendingAttachments } from './chat/use-pending-attachments';

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
  const {
    pendingAttachments,
    isDragActive,
    imageInputRef,
    fileInputRef,
    removePendingAttachment,
    clearPendingAttachments,
    handleUploadInputChange,
    handlePaste,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = usePendingAttachments({
    onQueueChange: () => setError(''),
  });

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

  async function refresh(afterOverride?: number | null) {
    setError('');
    setRefreshing(true);
    try {
      const effectiveCursor = afterOverride ?? cursor;
      const reset = effectiveCursor === null;
      const query = reset ? '' : `?after=${effectiveCursor}`;
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

  async function appendTimelineAfter(afterId: number | null) {
    const data = await apiFetch<TimelineResponse>(
      afterId === null ? '/timeline' : `/timeline?after=${afterId}`,
    );

    shouldScrollToBottomRef.current = true;
    setItems((current) => (afterId === null ? data.items : [...current, ...data.items]));
    setCursor(data.nextCursor);
    return data.nextCursor;
  }

  async function submitMessage(value: string) {
    const path = /^https?:\/\//i.test(value) ? '/messages/link' : '/messages/text';
    const key = path.endsWith('/link') ? 'url' : 'text';
    return apiFetch<TimelineItem>(path, {
      method: 'POST',
      body: JSON.stringify({ [key]: value }),
    });
  }

  async function handleSend(event?: FormEvent<HTMLFormElement>) {
    if (event) event.preventDefault();
    const value = text.trim();
    const attachmentsToSend = [...pendingAttachments];

    if (!value && attachmentsToSend.length === 0) return;

    setBusy(true);
    setError('');

    let nextCursor = cursor;
    let uploadedAttachmentCount = 0;

    try {
      if (value) {
        const item = await submitMessage(value);
        shouldScrollToBottomRef.current = true;
        setItems((current) => [...current, item]);
        setCursor(item.id);
        setText('');
        nextCursor = item.id;

        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      }

      for (let index = 0; index < attachmentsToSend.length; index += 1) {
        const attachment = attachmentsToSend[index];
        setUploadState({
          fileName: attachment.file.name,
          bytesSent: 0,
          bytesTotal: attachment.file.size,
          currentIndex: index + 1,
          totalCount: attachmentsToSend.length,
        });
        await uploadFile({
          file: attachment.file,
          currentIndex: index + 1,
          totalCount: attachmentsToSend.length,
          onProgress: setUploadState,
        });
        removePendingAttachment(attachment.id);
        uploadedAttachmentCount += 1;
      }

      if (uploadedAttachmentCount > 0) {
        nextCursor = await appendTimelineAfter(nextCursor);
      }

      if (attachmentsToSend.length === 0) {
        clearPendingAttachments();
      }
    } catch (sendError) {
      if (uploadedAttachmentCount > 0) {
        try {
          nextCursor = await appendTimelineAfter(nextCursor);
        } catch {}
      }

      setError(getUploadErrorMessage(sendError));
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
  const canSend = !!text.trim() || pendingAttachments.length > 0;

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

      <ChatComposer
        text={text}
        busy={busy}
        canSend={canSend}
        isDragActive={isDragActive}
        pendingAttachments={pendingAttachments}
        uploadState={uploadState}
        uploadPercent={uploadPercent}
        error={error}
        textareaRef={textareaRef}
        imageInputRef={imageInputRef}
        fileInputRef={fileInputRef}
        onTextChange={setText}
        onSubmit={handleSend}
        onPaste={handlePaste}
        onImageInputChange={handleUploadInputChange}
        onFileInputChange={handleUploadInputChange}
        onRemoveAttachment={removePendingAttachment}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      />
    </main>
  );
}
