import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metrics: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const end = this.metrics.httpRequestDurationSeconds.startTimer();
    res.on('finish', () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const route = (req.route?.path as string | undefined) ?? req.path;
      const labels = {
        method: req.method,
        route,
        status_code: String(res.statusCode),
      };
      this.metrics.httpRequestsTotal.inc(labels);
      const duration = end({ method: req.method, route });
      console.log(`INFO ${req.method} ${req.path} ${res.statusCode} ${(duration * 1000).toFixed(0)}ms`);
    });
    next();
  }
}
