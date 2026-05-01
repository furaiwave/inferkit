import { Module }          from '@nestjs/common';
import { HttpModule }       from '@nestjs/axios';
import { ThrottlerModule }  from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ProxyController }      from './proxy/proxy.controller';
import { ApiKeyGuard }          from './api-key/api-key.guard';
import { TransformInterceptor } from './transform/transform.interceptor';
import { AllExceptionsFilter }  from './transform/exception.filter';

@Module({
  imports: [
    HttpModule.register({ timeout: 120_000 }),

    // Глобальний rate limiting — 200 req/min по дефолту
    // Окремі роути перевизначають через @Throttle()
    ThrottlerModule.forRoot([{
      name:  'global',
      ttl:   60_000,
      limit: 200,
    }]),
  ],
  controllers: [ProxyController],
  providers: [
    { provide: APP_GUARD,       useClass: ApiKeyGuard },          // API key auth
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor }, // { success, data, ts } envelope
    { provide: APP_FILTER,      useClass: AllExceptionsFilter },  // єдиний формат помилок
  ],
})
export class AppModule {}