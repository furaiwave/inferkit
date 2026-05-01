import {
  All, Controller, Req, Res, UseGuards,
  UseInterceptors, Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiKeyGuard, Public } from '../api-key/api-key.guard';
import { TransformInterceptor } from '../transform/transform.interceptor';

const PYTHON_API = process.env['PYTHON_API_URL'] ?? 'http://localhost:8000';

// ─── Proxy controller ─────────────────────────────────────────────────────────
// Every request to the gateway is forwarded to Python FastAPI.
// Auth and throttling are applied here. Python never sees the client directly.

@Controller()
@UseGuards(ApiKeyGuard)
@UseInterceptors(TransformInterceptor)
export class ProxyController {
  private readonly logger = new Logger(ProxyController.name);

  constructor(private readonly http: HttpService) {}

  // Health — public, no auth needed
  @Public()
  @All('health')
  async health(): Promise<{ status: string }> {
    return { status: 'gateway-ok' };
  }

  // ─── All dataset routes ───────────────────────────────────────────────────
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @All(['datasets', 'datasets/*path'])
  async proxyDatasets(@Req() req: Request, @Res() res: Response): Promise<void> {
    return this._proxy(req, res);
  }

  // ─── All model routes ─────────────────────────────────────────────────────
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @All(['models', 'models/*path'])
  async proxyModels(@Req() req: Request, @Res() res: Response): Promise<void> {
    return this._proxy(req, res);
  }

  // ─── All prediction routes ────────────────────────────────────────────────
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @All(['predictions', 'predictions/*path'])
  async proxyPredictions(@Req() req: Request, @Res() res: Response): Promise<void> {
    return this._proxy(req, res);
  }

  // ─── Analytics ────────────────────────────────────────────────────────────
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @All(['analytics', 'analytics/*path'])
  async proxyAnalytics(@Req() req: Request, @Res() res: Response): Promise<void> {
    return this._proxy(req, res);
  }

  // ─── Core proxy logic ─────────────────────────────────────────────────────
  private async _proxy(req: Request, res: Response): Promise<void> {
    const qs = req.originalUrl.slice(req.path.length);
    const targetUrl = `${PYTHON_API}${req.path}${qs}`;

    this.logger.log(`${req.method} ${req.path} → ${targetUrl}`);

    const noBody    = ['GET', 'DELETE', 'HEAD'].includes(req.method);
    const multipart = req.headers['content-type']?.includes('multipart/form-data') ?? false;

    const config: AxiosRequestConfig = {
      method:  req.method as AxiosRequestConfig['method'],
      url:     targetUrl,
      headers: this._forwardHeaders(req),
      data:    noBody ? undefined : multipart ? req : req.body,
      validateStatus:   () => true,
      timeout:          120_000,
      maxBodyLength:    Infinity,
      maxContentLength: Infinity,
    };

    let axiosRes: AxiosResponse;
    try {
      axiosRes = await firstValueFrom(this.http.request(config));
    } catch (err) {
      this.logger.error(`Proxy error: ${(err as Error).message}`);
      res.status(502).json({
        success: false,
        error:   { statusCode: 502, message: 'Python API unreachable', path: req.path },
        ts:      new Date().toISOString(),
      });
      return;
    }

    const ts = new Date().toISOString();

    if (axiosRes.status >= 400) {
      this.logger.error(`Python ${axiosRes.status} on ${req.method} ${req.path}: ${JSON.stringify(axiosRes.data)}`);
      const raw     = axiosRes.data;
      const detail  = raw?.detail ?? raw?.message;
      const message = Array.isArray(detail)
        ? detail.map((e: Record<string, unknown>) => `${(e['loc'] as string[])?.join('.')}: ${e['msg']}`).join('; ')
        : typeof detail === 'string' ? detail : JSON.stringify(raw) || 'Upstream error';
      res.status(axiosRes.status).json({
        success: false,
        error:   { statusCode: axiosRes.status, message, path: req.path },
        ts,
      });
    } else {
      res.status(axiosRes.status).json({ success: true, data: axiosRes.data, ts });
    }
  }

  private _forwardHeaders(req: Request): Record<string, string> {
    // Strip hop-by-hop headers, keep content-type and accept
    const { authorization, 'x-api-key': _key, host, ...rest } = req.headers as Record<string, string>;
    return {
      ...rest,
      // Tag the request so Python knows it came through the gateway
      'x-forwarded-by': 'nestjs-gateway',
    };
  }
}