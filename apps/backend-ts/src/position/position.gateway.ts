import { forwardRef, Inject, Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis.provider';
import { REPLICATION_CHANNEL, PositionService } from './position.service';
import { MetricsService } from '../metrics/metrics.service';
import { PartitionService } from './partition.service';

@Injectable()
export class PositionGateway implements OnModuleInit, OnModuleDestroy {
  readonly wss = new WebSocketServer({ noServer: true });
  private subscriber: Redis;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly config: ConfigService,
    private readonly metrics: MetricsService,
    private readonly partition: PartitionService,
    @Inject(forwardRef(() => PositionService))
    private readonly positionService: PositionService,
  ) {}

  onModuleInit() {
    this.subscriber = new Redis({
      host: this.config.get('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
    });

    this.subscriber.subscribe(REPLICATION_CHANNEL);
    this.subscriber.on('message', async (_channel: string, message: string) => {
      if (this.partition.active) return;
      const data = JSON.parse(message) as { source: string; x: number; y: number; updated_at: string };
      if (data.source === 'ts') return;
      this.metrics.redisReceivedTotal.inc();
      await this.positionService.applyReplication(data.x, data.y, data.updated_at);
    });
  }

  broadcast(payload: object): void {
    const message = JSON.stringify(payload);
    this.wss.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(message);
      }
    });
  }

  onModuleDestroy() {
    this.subscriber.disconnect();
    this.wss.close();
  }

  handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer) {
    this.wss.handleUpgrade(req, socket, head, (ws) => {
      this.metrics.wsConnectionsActive.inc();
      ws.on('close', () => this.metrics.wsConnectionsActive.dec());
      this.wss.emit('connection', ws, req);
    });
  }
}
