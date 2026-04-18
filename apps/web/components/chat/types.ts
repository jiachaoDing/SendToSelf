import type { TimelineItem } from '../../lib/api';

export type SessionResponse = {
  device: {
    id: number;
    name: string;
  };
};

export type TimelineResponse = {
  items: TimelineItem[];
  nextCursor: number | null;
  hasMore: boolean;
};

export type UploadState = {
  fileName: string;
  bytesSent: number;
  bytesTotal: number;
  currentIndex: number;
  totalCount: number;
};

export type PendingAttachment = {
  id: string;
  file: File;
  kind: 'image' | 'file';
  previewUrl: string | null;
};
