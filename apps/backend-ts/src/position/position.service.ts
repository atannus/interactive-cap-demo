import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { Position } from './position.entity';
import { REDIS_CLIENT } from '../redis.provider';
import { MetricsService } from '../metrics/metrics.service';
import { PartitionService } from './partition.service';

export const POSITION_CHANNEL = 'position:updated';

@Injectable()
export class PositionService {
  constructor(
    @InjectRepository(Position)
    private readonly repo: Repository<Position>,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
    private readonly metrics: MetricsService,
    private readonly partition: PartitionService,
  ) {}

  async upsert(dataId: string, x: number, y: number): Promise<Position> {
    if (this.partition.active && this.partition.mode === 'CP') {
      throw new ServiceUnavailableException('Partition active: CP mode rejects writes');
    }
    await this.repo.upsert({ data_id: dataId, x, y }, ['data_id']);
    const position = await this.repo.findOneByOrFail({ data_id: dataId });
    if (!this.partition.active) {
      await this.redis.publish(
        POSITION_CHANNEL,
        JSON.stringify({
          x: position.x,
          y: position.y,
          updated_at: position.updated_at,
        }),
      );
      this.metrics.redisPublishedTotal.inc();
    }
    return position;
  }

  findOne(dataId: string): Promise<Position | null> {
    return this.repo.findOneBy({ data_id: dataId });
  }
}
