import { forwardRef, Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { Position } from './position.entity';
import { REDIS_CLIENT } from '../redis.provider';
import { MetricsService } from '../metrics/metrics.service';
import { PartitionService } from './partition.service';
import { PositionGateway } from './position.gateway';

export const REPLICATION_CHANNEL = 'position:replicated';

const DATA_ID = '1';

@Injectable()
export class PositionService {
  constructor(
    @InjectRepository(Position)
    private readonly repo: Repository<Position>,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
    private readonly metrics: MetricsService,
    private readonly partition: PartitionService,
    @Inject(forwardRef(() => PositionGateway))
    private readonly gateway: PositionGateway,
  ) {}

  async upsert(dataId: string, x: number, y: number): Promise<Position> {
    if (this.partition.active && this.partition.mode === 'CP') {
      throw new ServiceUnavailableException('Partition active: CP mode rejects writes');
    }
    const now = new Date();
    await this.repo.upsert({ data_id: dataId, x, y, updated_at: now }, ['data_id']);
    const payload = { x, y, updated_at: now.toISOString() };
    this.gateway.broadcast(payload);
    if (!this.partition.active) {
      try {
        await this.redis.publish(REPLICATION_CHANNEL, JSON.stringify({ source: 'ts', ...payload }));
        this.metrics.redisPublishedTotal.inc();
      } catch {
        // Redis unavailable; subscriber error handler will update partition state
      }
    }
    return { data_id: dataId, x, y, updated_at: now } as Position;
  }

  // Called by the gateway when a replication event arrives from FastAPI.
  // Does not re-publish to Redis — that would create a replication loop.
  async applyReplication(x: number, y: number, updatedAt: string): Promise<void> {
    const ts = new Date(updatedAt);
    await this.repo.upsert({ data_id: DATA_ID, x, y, updated_at: ts }, ['data_id']);
    this.gateway.broadcast({ x, y, updated_at: updatedAt });
  }

  findOne(dataId: string): Promise<Position | null> {
    return this.repo.findOneBy({ data_id: dataId });
  }
}
