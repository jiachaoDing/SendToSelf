'use client';

import { useEffect, useRef, useState, type ChangeEvent, type ClipboardEvent, type DragEvent } from 'react';
import {
  getPendingAttachmentKind,
  hasFilesInTransfer,
  revokePendingAttachmentPreview,
} from './attachment-utils';
import type { PendingAttachment } from './types';

type UsePendingAttachmentsOptions = {
  onQueueChange?: () => void;
};

export function usePendingAttachments({ onQueueChange }: UsePendingAttachmentsOptions = {}) {
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingAttachmentsRef = useRef<PendingAttachment[]>([]);
  const attachmentSequenceRef = useRef(0);
  const dragDepthRef = useRef(0);

  useEffect(() => {
    pendingAttachmentsRef.current = pendingAttachments;
  }, [pendingAttachments]);

  useEffect(() => {
    return () => {
      pendingAttachmentsRef.current.forEach(revokePendingAttachmentPreview);
    };
  }, []);

  function appendPendingFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList).filter((file): file is File => file instanceof File);
    if (files.length === 0) return;

    const attachments: PendingAttachment[] = files.map((file) => ({
      id: `pending-${attachmentSequenceRef.current += 1}`,
      file,
      kind: getPendingAttachmentKind(file),
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    }));

    onQueueChange?.();
    setPendingAttachments((current) => [...current, ...attachments]);
  }

  function removePendingAttachment(attachmentId: string) {
    setPendingAttachments((current) => {
      const attachment = current.find((item) => item.id === attachmentId);
      if (attachment) {
        revokePendingAttachmentPreview(attachment);
      }

      return current.filter((item) => item.id !== attachmentId);
    });
  }

  function clearPendingAttachments() {
    setPendingAttachments((current) => {
      current.forEach(revokePendingAttachmentPreview);
      return [];
    });
  }

  function handleUploadInputChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = '';
    if (files.length === 0) return;

    appendPendingFiles(files);
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter((file): file is File => file instanceof File);

    if (files.length === 0) return;

    event.preventDefault();
    appendPendingFiles(files);
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    if (!hasFilesInTransfer(event.dataTransfer)) return;
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDragActive(true);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (!hasFilesInTransfer(event.dataTransfer)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    if (!isDragActive) {
      setIsDragActive(true);
    }
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    if (!hasFilesInTransfer(event.dataTransfer)) return;
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);

    if (dragDepthRef.current === 0) {
      setIsDragActive(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    if (!hasFilesInTransfer(event.dataTransfer)) return;
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDragActive(false);

    if (event.dataTransfer.files.length > 0) {
      appendPendingFiles(event.dataTransfer.files);
    }
  }

  return {
    pendingAttachments,
    isDragActive,
    imageInputRef,
    fileInputRef,
    appendPendingFiles,
    removePendingAttachment,
    clearPendingAttachments,
    handleUploadInputChange,
    handlePaste,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
