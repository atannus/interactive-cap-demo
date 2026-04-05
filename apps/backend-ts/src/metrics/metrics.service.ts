import { Injectable } from '@nestjs/common';
import { Registry, Counter, Gauge, Histogram } from 'prom-client';

@Injectable()
export class MetricsService {
  readonly registry = new Registry(); // NOT the global default — avoids watch-mode errors

  readonly httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status_code'] as const,
    registers: [this.registry],
  });

  readonly httpRequestDurationSeconds = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration',
    labelNames: ['method', 'route'] as const,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [this.registry],
  });

  readonly wsConnectionsActive = new Gauge({
    name: 'ws_connections_active',
    help: 'Active WebSocket connections',
    registers: [this.registry],
  });

  readonly redisPublishedTotal = new Counter({
    name: 'redis_messages_published_total',
    help: 'Redis messages published',
    registers: [this.registry],
  });

  readonly redisReceivedTotal = new Counter({
    name: 'redis_messages_received_total',
    help: 'Redis messages received from subscriber',
    registers: [this.registry],
  });
}
