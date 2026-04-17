import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EVENTS, Server, type Upload } from '@tus/server';
import { FileStore } from '@tus/file-store';
import express, { type Express, type Request as ExpressRequest } from 'express';
import { mkdirSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { MAX_UPLOAD_SIZE_BYTES } from '../client/client-config.service';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { AuthService } from '../auth/auth.service';
import { AttachmentsService } from './attachments.service';

type TusHookRequest = {
  runtime?: {
    node?: {
      req?: unknown;
    };
  };
};

class TusHttpError extends Error {
  constructor(
    readonly status_code: number,
    readonly body: string,
  ) {
    super(body.trim());
  }
}

function resolveUploadDir(uploadDir: string) {
  const absoluteDir = isAbsolute(uploadDir)
    ? uploadDir
    : resolve(process.cwd(), uploadDir);
  mkdirSync(absoluteDir, { recursive: true });
  return absoluteDir;
}

@Injectable()
export class AttachmentsTusService {
  private readonly logger = new Logger(AttachmentsTusService.name);
  private readonly uploadDir: string;
  private readonly server: Server;
  private mounted = false;

  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
    private readonly attachmentsService: AttachmentsService,
  ) {
    this.uploadDir = resolveUploadDir(
      configService.get<string>('UPLOAD_DIR') ?? './uploads',
    );
    this.server = new Server({
      path: '/api/uploads',
      relativeLocation: true,
      maxSize: MAX_UPLOAD_SIZE_BYTES,
      datastore: new FileStore({
        directory: this.uploadDir,
      }),
      disableTerminationForFinishedUploads: true,
      onIncomingRequest: async (request) => {
        await this.authenticateRequest(request);
      },
      onUploadCreate: async (request, upload) => {
        return this.handleUploadCreate(request, upload);
      },
      onUploadFinish: async (request, upload) => {
        await this.handleUploadFinish(request, upload);
        return {};
      },
    });

    this.server.on(EVENTS.POST_TERMINATE, (_request, _response, uploadId) => {
      void this.attachmentsService
        .markUploadSessionTerminated(uploadId)
        .catch((error: unknown) => {
          this.logger.error(
            `Failed to mark upload ${uploadId} as terminated`,
            error instanceof Error ? error.stack : undefined,
          );
        });
    });
  }

  mount(app: Express) {
    if (this.mounted) {
      return;
    }

    const uploadApp = express();
    uploadApp.use((request, response) => {
      void this.server.handle(request, response);
    });

    app.use('/uploads', uploadApp);
    this.mounted = true;
  }

  private async handleUploadCreate(request: TusHookRequest, upload: Upload) {
    try {
      const auth = await this.authenticateRequest(request);
      const originalName = this.getRequiredMetadataValue(
        upload,
        'filename',
        'filename metadata is required',
      );
      const mimeType =
        this.getOptionalMetadataValue(upload, 'filetype') ??
        'application/octet-stream';

      if (typeof upload.size !== 'number' || upload.size < 0) {
        throw new BadRequestException('Upload length is required');
      }

      await this.attachmentsService.createUploadSession({
        tusUploadId: upload.id,
        deviceId: auth.deviceId,
        originalName,
        mimeType,
        size: upload.size,
        storagePath: join(this.uploadDir, upload.id),
      });

      return {};
    } catch (error) {
      throw this.createTusError(error);
    }
  }

  private async handleUploadFinish(request: TusHookRequest, upload: Upload) {
    try {
      await this.authenticateRequest(request);
      await this.attachmentsService.finalizeUploadSession(upload.id);
    } catch (error) {
      throw this.createTusError(error);
    }
  }

  private async authenticateRequest(request: TusHookRequest) {
    const nodeRequest = this.getNodeRequest(request);
    const authenticatedRequest = nodeRequest as AuthenticatedRequest;

    if (authenticatedRequest.auth) {
      return authenticatedRequest.auth;
    }

    const auth = await this.authService.authenticateRequest(nodeRequest);
    Object.assign(authenticatedRequest, { auth });
    return auth;
  }

  private getNodeRequest(request: TusHookRequest) {
    const nodeRequest = request.runtime?.node?.req;

    if (!nodeRequest) {
      throw new Error('Expected a Node.js request');
    }

    return nodeRequest as ExpressRequest;
  }

  private getRequiredMetadataValue(
    upload: Upload,
    key: string,
    message: string,
  ) {
    const value = this.getOptionalMetadataValue(upload, key);

    if (!value) {
      throw new BadRequestException(message);
    }

    return value;
  }

  private getOptionalMetadataValue(upload: Upload, key: string) {
    const value = upload.metadata?.[key];

    if (typeof value !== 'string') {
      return null;
    }

    const normalized = value.trim();
    return normalized ? normalized : null;
  }

  private toTusError(error: unknown) {
    if (error instanceof HttpException) {
      const response = error.getResponse();
      const payload =
        typeof response === 'object' && response !== null
          ? (response as { message?: string | string[] })
          : null;
      const message =
        typeof response === 'string'
          ? response
          : Array.isArray(payload?.message)
            ? payload.message.join(', ')
            : typeof payload?.message === 'string'
              ? payload.message
              : error.message;

      return {
        status_code: error.getStatus(),
        body: `${message}\n`,
      };
    }

    if (error instanceof Error) {
      return {
        status_code: 500,
        body: `${error.message}\n`,
      };
    }

    return {
      status_code: 500,
      body: 'Upload request failed\n',
    };
  }

  private createTusError(error: unknown) {
    const { status_code, body } = this.toTusError(error);
    return new TusHttpError(status_code, body);
  }
}
