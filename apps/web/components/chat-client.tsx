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

const TUS_CHUNK_SIZE_BYTES = 8 * 1024 * 1024;
const TUS_RETRY_DELAYS_MS = [0, 1000, 3000, 5000];

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KiB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GiB`;
}

function getUploadErrorMessage(error: unknown) {
  if (error instanceof tus.DetailedError) {
    const body = error.originalResponse?.getBody()?.trim();
    if (body) {
      return body;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '上传失败';
}

export function ChatClient() {
  const router = useRouter();
  const [deviceName, setDeviceName] = useState('');
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
  const pendingScrollOffsetRef = useRef<number | null>(null);
  const shouldScrollToBottomRef = useRef(false);

  useEffect(() => {
    async function initialize() {
      try {
        const session = await apiFetch<SessionResponse>('/auth/session');
        setDeviceName(session.device.name);
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

    if (!container) {
      return;
    }

    if (pendingScrollOffsetRef.current !== null) {
      container.scrollTop =
        container.scrollHeight - pendingScrollOffsetRef.current;
      pendingScrollOffsetRef.current = null;
      return;
    }

    if (shouldScrollToBottomRef.current) {
      container.scrollTop = container.scrollHeight;
      shouldScrollToBottomRef.current = false;
    }
  }, [items]);

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
      setError(
        refreshError instanceof Error ? refreshError.message : '刷新失败',
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function loadOlder() {
    if (!hasMoreHistory || items.length === 0) {
      return;
    }

    setError('');
    setLoadingOlder(true);
    const container = timelineRef.current;

    if (container) {
      pendingScrollOffsetRef.current =
        container.scrollHeight - container.scrollTop;
    }

    try {
      const data = await apiFetch<TimelineResponse>(
        `/timeline?before=${items[0].id}`,
      );

      setItems((current) => [...data.items, ...current]);
      setHasMoreHistory(data.hasMore);
    } catch (loadOlderError) {
      pendingScrollOffsetRef.current = null;
      setError(
        loadOlderError instanceof Error
          ? loadOlderError.message
          : '加载更早消息失败',
      );
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
          setUploadState({
            fileName: file.name,
            bytesSent,
            bytesTotal,
          });
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
          if (previousUploads.length > 0) {
            upload.resumeFromPreviousUpload(previousUploads[0]);
          }

          upload.start();
        })
        .catch((uploadError) => {
          reject(uploadError);
        });
    });
  }

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = text.trim();
    if (!value) {
      return;
    }

    setBusy(true);
    setError('');

    try {
      const path = /^https?:\/\//i.test(value)
        ? '/messages/link'
        : '/messages/text';
      const key = path.endsWith('/link') ? 'url' : 'text';
      const item = await apiFetch<TimelineItem>(path, {
        method: 'POST',
        body: JSON.stringify({ [key]: value }),
      });

      shouldScrollToBottomRef.current = true;
      setItems((current) => [...current, item]);
      setCursor(item.id);
      setText('');
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : '发送失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setBusy(true);
    setError('');
    setUploadState({
      fileName: file.name,
      bytesSent: 0,
      bytesTotal: file.size,
    });

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
    ? Math.min(
        100,
        Math.round(
          (uploadState.bytesSent / Math.max(uploadState.bytesTotal, 1)) * 100,
        ),
      )
    : 0;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="rounded-2xl border border-stone-200 bg-white px-6 py-4 text-sm text-stone-500 shadow-sm">
          正在加载...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-4xl flex-col rounded-3xl border border-stone-200 bg-white shadow-sm">
        <header className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <div>
            <h1 className="text-xl font-semibold text-stone-900">
              Send to Self
            </h1>
            <p className="text-sm text-stone-500">当前设备：{deviceName}</p>
          </div>
          <div className="flex gap-2">
            <button
              className="rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-700"
              disabled={busy || refreshing || loadingOlder}
              onClick={() => void refresh()}
              type="button"
            >
              {refreshing ? '刷新中...' : '手动刷新'}
            </button>
            <button
              className="rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-700"
              disabled={busy}
              onClick={() => void handleLogout()}
              type="button"
            >
              退出
            </button>
          </div>
        </header>

        <section
          className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
          ref={timelineRef}
        >
          {hasMoreHistory ? (
            <div className="flex justify-center">
              <button
                className="rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-700"
                disabled={loadingOlder || refreshing}
                onClick={() => void loadOlder()}
                type="button"
              >
                {loadingOlder ? '加载中...' : '加载更早消息'}
              </button>
            </div>
          ) : null}

          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">
              还没有内容，先发一条给自己。
            </div>
          ) : null}

          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
            >
              <div className="mb-2 flex items-center justify-between gap-4 text-xs text-stone-500">
                <span>{item.device.name}</span>
                <span>{new Date(item.createdAt).toLocaleString()}</span>
              </div>

              {item.type === 'text' || item.type === 'link' ? (
                item.type === 'link' ? (
                  <a
                    className="break-all text-sm text-sky-700 underline"
                    href={item.textContent ?? '#'}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {item.textContent}
                  </a>
                ) : (
                  <p className="whitespace-pre-wrap break-words text-sm text-stone-900">
                    {item.textContent}
                  </p>
                )
              ) : null}

              {item.attachment ? (
                <div className="space-y-3">
                  {item.type === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={item.attachment.originalName}
                      className="max-h-96 rounded-2xl border border-stone-200 object-contain"
                      src={resolveApiUrl(item.attachment.url)}
                    />
                  ) : null}

                  <a
                    className="inline-flex rounded-full border border-stone-300 px-3 py-2 text-sm text-stone-700"
                    href={resolveApiUrl(item.attachment.url)}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {item.type === 'image' ? '打开原图' : '下载文件'}：
                    {item.attachment.originalName}
                  </a>
                </div>
              ) : null}
            </article>
          ))}
        </section>

        <footer className="border-t border-stone-200 px-4 py-4">
          <form className="space-y-3" onSubmit={handleSend}>
            <textarea
              className="min-h-28 w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-stone-500"
              disabled={busy}
              onChange={(event) => setText(event.target.value)}
              placeholder="输入文字，或直接粘贴 http/https 链接"
              value={text}
            />

            <div className="flex flex-wrap items-center gap-3">
              <label className="rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-700">
                {uploadState ? '上传中...' : '上传图片'}
                <input
                  accept="image/*"
                  className="hidden"
                  disabled={busy}
                  onChange={(event) => void handleUpload(event)}
                  type="file"
                />
              </label>

              <label className="rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-700">
                {uploadState ? '上传中...' : '上传文件'}
                <input
                  className="hidden"
                  disabled={busy}
                  onChange={(event) => void handleUpload(event)}
                  type="file"
                />
              </label>

              <button
                className="rounded-full bg-stone-900 px-5 py-2 text-sm text-white"
                disabled={busy || !text.trim()}
                type="submit"
              >
                发送
              </button>
            </div>

            {uploadState ? (
              <p className="text-sm text-stone-500">
                正在上传 {uploadState.fileName} · {uploadPercent}% (
                {formatBytes(uploadState.bytesSent)} /{' '}
                {formatBytes(uploadState.bytesTotal)})
              </p>
            ) : null}

            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </form>
        </footer>
      </div>
    </main>
  );
}
