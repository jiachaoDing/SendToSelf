import * as tus from 'tus-js-client';
import { resolveApiUrl } from '../../lib/api';
import type { UploadState } from './types';

const TUS_CHUNK_SIZE_BYTES = 8 * 1024 * 1024;
const TUS_RETRY_DELAYS_MS = [0, 1000, 3000, 5000];

type UploadFileOptions = {
  file: File;
  currentIndex: number;
  totalCount: number;
  onProgress: (state: UploadState) => void;
};

export function uploadFile({ file, currentIndex, totalCount, onProgress }: UploadFileOptions) {
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
        onProgress({ fileName: file.name, bytesSent, bytesTotal, currentIndex, totalCount });
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
