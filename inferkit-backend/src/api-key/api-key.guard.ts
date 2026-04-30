import {
  CanActivate, ExecutionContext, Injectable,
  UnauthorizedException, SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };
type ValidApiKey = Brand<string, 'ValidApiKey'>;

export const IS_PUBLIC = 'isPublic' as const;
export const Public = () => SetMetadata(IS_PUBLIC, true);

function extractKey(req: Request): string | undefined {
  const auth = req.headers['authorization'];
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  const x = req.headers['x-api-key'];
  return typeof x === 'string' ? x : undefined;
}

function isValid(key: string): key is ValidApiKey {
  const keys = (process.env['API_KEYS'] ?? '')
    .split(',').map((k) => k.trim()).filter(Boolean);
  // Dev mode: allow all when no keys configured
  if (keys.length === 0 && process.env['NODE_ENV'] !== 'production') return true;
  return keys.includes(key);
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      ctx.getHandler(), ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    const key = extractKey(req);

    if (!key) throw new UnauthorizedException(
      'API key required. Use Authorization: Bearer <key> or X-Api-Key header.',
    );
    if (!isValid(key)) throw new UnauthorizedException('Invalid API key.');
    return true;
  }
}