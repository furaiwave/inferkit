import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// Gateway envelope — added on top of whatever Python returns
export interface GatewayEnvelope<T> {
  readonly success: true;
  readonly data:    T;
  readonly ts:      string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, GatewayEnvelope<T>> {
  intercept(
    _ctx: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<GatewayEnvelope<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true as const,
        data,
        ts: new Date().toISOString(),
      })),
    );
  }
}