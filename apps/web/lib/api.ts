const apiBasePath = '/api';

export type TimelineItem = {
  id: number;
  type: 'text' | 'link' | 'image' | 'file';
  textContent: string | null;
  createdAt: string;
  device: {
    id: number;
    name: string;
  };
  attachment: {
    id: number;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
  } | null;
};

function withApiBasePath(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  if (path.startsWith(apiBasePath)) {
    return path;
  }

  return `${apiBasePath}${path.startsWith('/') ? path : `/${path}`}`;
}

export function resolveApiUrl(path: string) {
  return withApiBasePath(path);
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(withApiBasePath(path), {
    ...init,
    credentials: 'include',
    headers: {
      ...(init?.body instanceof FormData
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const message = Array.isArray(payload?.message)
      ? payload.message.join(', ')
      : payload?.message || 'Request failed';

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}
