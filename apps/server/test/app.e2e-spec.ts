import {
  ConflictException,
  ForbiddenException,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { join } from 'node:path';
import request from 'supertest';
import { AttachmentsController } from '../src/attachments/attachments.controller';
import { AttachmentsService } from '../src/attachments/attachments.service';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { SessionAuthGuard } from '../src/auth/guards/session-auth.guard';
import { ClientConfigService } from '../src/client/client-config.service';
import { ClientController } from '../src/client/client.controller';
import { DATABASE } from '../src/database/database.module';
import { DevicesService } from '../src/devices/devices.service';
import { MessagesService } from '../src/messages/messages.service';
import { SyncController } from '../src/sync/sync.controller';

describe('Auth transport smoke', () => {
  let app: INestApplication;
  let authVersion: number;
  let initialized: boolean;
  let remoteClientEnabled: boolean;

  const device = {
    id: 1,
    name: 'Test Device',
  };
  const attachmentPath = join(
    __dirname,
    '..',
    'uploads',
    '17cce681acbb61db1276fca9298d31bc',
  );
  const timelineItems = Array.from({ length: 60 }, (_, index) => ({
    id: index + 1,
    type: 'text' as const,
    textContent: `message-${index + 1}`,
    createdAt: new Date(`2026-01-01T00:${String(index).padStart(2, '0')}:00Z`),
    device,
    attachment: null,
  }));
  const timelinePayload = timelineItems.map((item) => ({
    ...item,
    createdAt: item.createdAt.toISOString(),
  }));

  function getToken(version: number) {
    return `valid-token-v${version}`;
  }

  const login = jest.fn((password: string, deviceName: string) => {
    void password;

    if (!initialized) {
      return Promise.reject(
        new ConflictException('Authentication setup is required'),
      );
    }

    return Promise.resolve({
      token: getToken(authVersion),
      device: {
        ...device,
        name: deviceName,
      },
    });
  });
  const setup = jest.fn((password: string) => {
    void password;

    if (initialized) {
      return Promise.reject(
        new ConflictException('Authentication is already initialized'),
      );
    }

    initialized = true;
    return Promise.resolve({ ok: true });
  });
  const validateToken = jest.fn((token: string) => {
    if (!token) {
      return Promise.reject(
        new UnauthorizedException('Authentication required'),
      );
    }

    if (token !== getToken(authVersion)) {
      return Promise.reject(new UnauthorizedException('Invalid session'));
    }

    return Promise.resolve({ deviceId: device.id });
  });
  const authenticateRequest = jest.fn(
    (request: { headers?: { authorization?: string; cookie?: string } }) => {
      const authorization = request.headers?.authorization;
      if (authorization?.startsWith('Bearer ')) {
        if (!remoteClientEnabled) {
          return Promise.reject(
            new ForbiddenException('Remote clients are disabled'),
          );
        }
        return validateToken(authorization.slice(7));
      }

      const cookieHeader = request.headers?.cookie ?? '';
      const match = cookieHeader.match(/sts_session=([^;]+)/);
      return validateToken(match?.[1] ?? '');
    },
  );
  const revokeToken = jest.fn((token?: string) => {
    if (token === getToken(authVersion)) {
      authVersion += 1;
    }

    return Promise.resolve();
  });
  const authService = {
    login,
    setup,
    validateToken,
    authenticateRequest,
    revokeToken,
  };
  const clientConfigService = {
    isRemoteClientEnabled: jest.fn(() => remoteClientEnabled),
    getBootstrapPayload: jest.fn((requiresSetup: boolean) => ({
      instance: {
        name: 'Send to Self',
        version: '0.0.1',
      },
      remoteClient: {
        enabled: remoteClientEnabled,
      },
      auth: {
        loginPath: '/auth/login',
        setupPath: '/setup',
        requiresSetup,
        tokenPath: '/auth/token',
        logoutPath: '/auth/logout',
        builtInWeb: 'cookie',
        remoteClient: remoteClientEnabled ? 'bearer' : 'disabled',
      },
      uploads: {
        maxBytes: 25 * 1024 * 1024,
      },
      attachments: {
        requiresAuth: true,
      },
    })),
  };

  const devicesService = {
    getById: jest.fn((deviceId: number) =>
      Promise.resolve({
        id: deviceId,
        name: device.name,
        authVersion,
      }),
    ),
    touch: jest.fn(() => Promise.resolve(undefined)),
  };

  const messagesService = {
    listTimeline: jest.fn(
      (options?: { after?: number; before?: number; limit?: number }) => {
        let items = [...timelineItems];

        if (options?.after !== undefined) {
          items = items.filter((item) => item.id > options.after!);
        }

        if (options?.before !== undefined) {
          items = items.filter((item) => item.id < options.before!);
        }

        const limit = options?.limit;

        if (limit === undefined) {
          return Promise.resolve({
            items,
            hasMore: false,
          });
        }

        if (options?.after !== undefined) {
          return Promise.resolve({
            items: items.slice(0, limit),
            hasMore: items.length > limit,
          });
        }

        return Promise.resolve({
          items: items.slice(-limit),
          hasMore: items.length > limit,
        });
      },
    ),
  };
  const attachmentsService = {
    getById: jest.fn(() =>
      Promise.resolve({
        id: 1,
        originalName: 'fixture.png',
        mimeType: 'image/png',
        size: 123,
        storagePath: attachmentPath,
      }),
    ),
  };
  const database = {
    query: {
      appConfig: {
        findFirst: jest.fn(() =>
          Promise.resolve(
            initialized
              ? {
                  id: 1,
                  passwordHash: 'hashed-password',
                }
              : undefined,
          ),
        ),
      },
    },
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [
        AuthController,
        AttachmentsController,
        ClientController,
        SyncController,
      ],
      providers: [
        SessionAuthGuard,
        {
          provide: AuthService,
          useValue: authService,
        },
        {
          provide: AttachmentsService,
          useValue: attachmentsService,
        },
        {
          provide: ClientConfigService,
          useValue: clientConfigService,
        },
        {
          provide: DATABASE,
          useValue: database,
        },
        {
          provide: DevicesService,
          useValue: devicesService,
        },
        {
          provide: MessagesService,
          useValue: messagesService,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  beforeEach(() => {
    authVersion = 1;
    initialized = true;
    remoteClientEnabled = true;
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('keeps the web cookie auth flow working', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const loginResponse = await request(httpServer)
      .post('/auth/login')
      .send({
        password: 'change-me',
        deviceName: device.name,
      })
      .expect(201);

    expect(loginResponse.body).toEqual({
      device,
    });
    expect(loginResponse.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`sts_session=${getToken(1)}`),
      ]),
    );

    const cookie = loginResponse.headers['set-cookie'][0];

    const sessionResponse = await request(httpServer)
      .get('/auth/session')
      .set('Cookie', cookie)
      .expect(200);

    expect(sessionResponse.body).toEqual({
      device,
    });
  });

  it('reports setup status through bootstrap before initialization', async () => {
    initialized = false;
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const response = await request(httpServer)
      .get('/client/bootstrap')
      .expect(200);

    expect(response.body).toEqual({
      instance: {
        name: 'Send to Self',
        version: '0.0.1',
      },
      remoteClient: {
        enabled: true,
      },
      auth: {
        loginPath: '/auth/login',
        setupPath: '/setup',
        requiresSetup: true,
        tokenPath: '/auth/token',
        logoutPath: '/auth/logout',
        builtInWeb: 'cookie',
        remoteClient: 'bearer',
      },
      uploads: {
        maxBytes: 25 * 1024 * 1024,
      },
      attachments: {
        requiresAuth: true,
      },
    });
  });

  it('creates the one-time password through setup', async () => {
    initialized = false;
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    await request(httpServer)
      .post('/auth/setup')
      .send({
        password: 'change-me',
      })
      .expect(201);

    expect(setup).toHaveBeenCalledWith('change-me');

    const bootstrapResponse = await request(httpServer)
      .get('/client/bootstrap')
      .expect(200);

    expect(
      (
        bootstrapResponse.body as {
          auth: { requiresSetup: boolean };
        }
      ).auth.requiresSetup,
    ).toBe(false);
  });

  it('rejects setup after initialization completes', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const response = await request(httpServer)
      .post('/auth/setup')
      .send({
        password: 'change-me',
      })
      .expect(409);

    expect((response.body as { message: string }).message).toBe(
      'Authentication is already initialized',
    );
  });

  it('rejects login before setup completes', async () => {
    initialized = false;
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    await request(httpServer)
      .post('/auth/login')
      .send({
        password: 'change-me',
        deviceName: device.name,
      })
      .expect(409);
  });

  it('rejects token creation before setup completes', async () => {
    initialized = false;
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    await request(httpServer)
      .post('/auth/token')
      .send({
        password: 'change-me',
        deviceName: 'CLI Device',
      })
      .expect(409);
  });

  it('supports bearer tokens for non-web clients', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const tokenResponse = await request(httpServer)
      .post('/auth/token')
      .send({
        password: 'change-me',
        deviceName: 'CLI Device',
      })
      .expect(201);

    expect(tokenResponse.body).toEqual({
      token: getToken(1),
      device: {
        id: device.id,
        name: 'CLI Device',
      },
    });

    const timelineResponse = await request(httpServer)
      .get('/timeline')
      .set('Authorization', `Bearer ${getToken(1)}`)
      .expect(200);

    expect(timelineResponse.body).toEqual({
      items: timelinePayload.slice(-50),
      nextCursor: 60,
      hasMore: true,
    });
  });

  it('rejects token creation when remote clients are disabled', async () => {
    remoteClientEnabled = false;
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const response = await request(httpServer)
      .post('/auth/token')
      .send({
        password: 'change-me',
        deviceName: 'CLI Device',
      })
      .expect(403);

    expect((response.body as { message: string }).message).toBe(
      'Remote clients are disabled',
    );
  });

  it('revokes the current cookie session on logout', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const loginResponse = await request(httpServer)
      .post('/auth/login')
      .send({
        password: 'change-me',
        deviceName: device.name,
      })
      .expect(201);

    const cookie = loginResponse.headers['set-cookie'][0];

    await request(httpServer)
      .post('/auth/logout')
      .set('Cookie', cookie)
      .expect(201);

    await request(httpServer)
      .get('/auth/session')
      .set('Cookie', cookie)
      .expect(401);
  });

  it('revokes the current bearer token on logout', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const tokenResponse = await request(httpServer)
      .post('/auth/token')
      .send({
        password: 'change-me',
        deviceName: 'CLI Device',
      })
      .expect(201);

    const token = (tokenResponse.body as { token: string }).token;

    await request(httpServer)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    await request(httpServer)
      .get('/timeline')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });

  it('rejects protected requests without any token', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    await request(httpServer).get('/auth/session').expect(401);
  });

  it('rejects invalid bearer tokens', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    await request(httpServer)
      .get('/timeline')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });

  it('rejects bearer access to protected routes when remote clients are disabled', async () => {
    remoteClientEnabled = false;
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const response = await request(httpServer)
      .get('/timeline')
      .set('Authorization', `Bearer ${getToken(1)}`)
      .expect(403);

    expect((response.body as { message: string }).message).toBe(
      'Remote clients are disabled',
    );
  });

  it('returns bootstrap metadata for remote client discovery', async () => {
    remoteClientEnabled = false;
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const disabledResponse = await request(httpServer)
      .get('/client/bootstrap')
      .expect(200);

    expect(disabledResponse.body).toEqual({
      instance: {
        name: 'Send to Self',
        version: '0.0.1',
      },
      remoteClient: {
        enabled: false,
      },
      auth: {
        loginPath: '/auth/login',
        setupPath: '/setup',
        requiresSetup: false,
        tokenPath: '/auth/token',
        logoutPath: '/auth/logout',
        builtInWeb: 'cookie',
        remoteClient: 'disabled',
      },
      uploads: {
        maxBytes: 25 * 1024 * 1024,
      },
      attachments: {
        requiresAuth: true,
      },
    });

    remoteClientEnabled = true;

    const enabledResponse = await request(httpServer)
      .get('/client/bootstrap')
      .expect(200);

    expect(
      (
        enabledResponse.body as {
          remoteClient: { enabled: boolean };
          auth: { remoteClient: string };
        }
      ).remoteClient,
    ).toEqual({
      enabled: true,
    });
    expect(
      (
        enabledResponse.body as {
          remoteClient: { enabled: boolean };
          auth: { remoteClient: string };
        }
      ).auth.remoteClient,
    ).toBe('bearer');
  });

  it('keeps attachment download behind the same auth guard', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    await request(httpServer).get('/attachments/1').expect(401);

    await request(httpServer)
      .get('/attachments/1')
      .set('Authorization', `Bearer ${getToken(1)}`)
      .expect(200);
  });

  it('returns the most recent page on initial timeline load', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const response = await request(httpServer)
      .get('/timeline')
      .set('Authorization', `Bearer ${getToken(1)}`)
      .expect(200);

    expect(response.body).toEqual({
      items: timelinePayload.slice(-50),
      nextCursor: 60,
      hasMore: true,
    });
    expect(messagesService.listTimeline).toHaveBeenCalledWith({
      after: undefined,
      before: undefined,
      limit: 50,
    });
  });

  it('returns older messages when before is provided', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const response = await request(httpServer)
      .get('/timeline?before=21&limit=10')
      .set('Authorization', `Bearer ${getToken(1)}`)
      .expect(200);

    expect(response.body).toEqual({
      items: timelinePayload.slice(10, 20),
      nextCursor: 20,
      hasMore: true,
    });
  });

  it('keeps after semantics for incremental updates', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const response = await request(httpServer)
      .get('/timeline?after=57')
      .set('Authorization', `Bearer ${getToken(1)}`)
      .expect(200);

    expect(response.body).toEqual({
      items: timelinePayload.slice(57),
      nextCursor: 60,
      hasMore: false,
    });
  });

  it('applies limit to paged timeline requests', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const response = await request(httpServer)
      .get('/timeline?limit=5')
      .set('Authorization', `Bearer ${getToken(1)}`)
      .expect(200);

    expect(response.body).toEqual({
      items: timelinePayload.slice(-5),
      nextCursor: 60,
      hasMore: true,
    });
  });
});
