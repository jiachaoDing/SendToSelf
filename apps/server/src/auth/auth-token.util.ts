import type { Request } from 'express';
import { SESSION_COOKIE_NAME } from './auth.constants';

export type RequestTokenSource = 'bearer' | 'cookie' | null;

export function extractRequestAuth(request: Request) {
  const authorization = request.headers.authorization;

  if (typeof authorization === 'string') {
    const [scheme, token] = authorization.split(' ');

    if (scheme === 'Bearer' && token) {
      return {
        token,
        source: 'bearer' as const,
      };
    }
  }

  const cookies = request.cookies as Record<string, unknown> | undefined;
  const token =
    typeof cookies?.[SESSION_COOKIE_NAME] === 'string'
      ? cookies[SESSION_COOKIE_NAME]
      : undefined;

  return {
    token,
    source: token ? ('cookie' as const) : null,
  };
}

export function extractRequestToken(request: Request) {
  return extractRequestAuth(request).token;
}
