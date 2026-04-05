import { Injectable, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis.provider';
import { POSITION_CHANNEL } from './position.service';

@Injectable()
export class PositionGateway implements OnModuleInit, OnModuleDestroy {
  readonly wss = new WebSocketServer({ noServer: true });
  private subscriber: Redis;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    this.subscriber = new Redis({
      host: this.config.get('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
    });

    this.subscriber.subscribe(POSITION_CHANNEL);
    this.subscriber.on('message', (_channel: string, message: string) => {
      this.wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
          client.send(message);
        }
      });
    });
  }

  onModuleDestroy() {
    this.subscriber.disconnect();
    this.wss.close();
  }

  handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer) {
    this.wss.handleUpgrade(req, socket, head, (ws) => {
      this.wss.emit('connection', ws, req);
    });
  }
}
