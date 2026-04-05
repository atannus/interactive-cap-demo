import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metrics: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const end = this.metrics.httpRequestDurationSeconds.startTimer();
    res.on('finish', () => {
      const route = (req.route?.path as string | undefined) ?? req.path;
      const labels = { method: req.method, route, status_code: String(res.statusCode) };
      this.metrics.httpRequestsTotal.inc(labels);
      end({ method: req.method, route });
    });
    next();
  }
}
