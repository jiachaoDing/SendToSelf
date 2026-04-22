import * as tus from 'tus-js-client';
import type { PendingAttachment } from './types';

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function getPendingAttachmentKind(file: File) {
  return file.type.startsWith('image/') ? 'image' : 'file';
}

export function revokePendingAttachmentPreview(attachment: PendingAttachment) {
  if (attachment.previewUrl) {
    URL.revokeObjectURL(attachment.previewUrl);
  }
}

export function hasFilesInTransfer(dataTransfer: DataTransfer | null) {
  if (!dataTransfer) return false;

  if (dataTransfer.items.length > 0) {
    return Array.from(dataTransfer.items).some((item) => item.kind === 'file');
  }

  return dataTransfer.files.length > 0;
}

export function getUploadErrorMessage(error: unknown) {
  if (error instanceof tus.DetailedError) {
    const body = error.originalResponse?.getBody()?.trim();
    if (body) return body;
  }
  if (error instanceof Error) return error.message;
  return 'Upload failed';
}
