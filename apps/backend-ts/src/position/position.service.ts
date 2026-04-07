import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { Position } from './position.entity';
import { REDIS_CLIENT } from '../redis.provider';
import { MetricsService } from '../metrics/metrics.service';

export const POSITION_CHANNEL = 'position:updated';

@Injectable()
export class PositionService {
  constructor(
    @InjectRepository(Position)
    private readonly repo: Repository<Position>,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
    private readonly metrics: MetricsService,
  ) {}

  async upsert(dataId: string, x: number, y: number): Promise<Position> {
    await this.repo.upsert({ data_id: dataId, x, y }, ['data_id']);
    const position = await this.repo.findOneByOrFail({ data_id: dataId });
    await this.redis.publish(
      POSITION_CHANNEL,
      JSON.stringify({
        x: position.x,
        y: position.y,
        updated_at: position.updated_at,
      }),
    );
    this.metrics.redisPublishedTotal.inc();
    return position;
  }

  findOne(dataId: string): Promise<Position | null> {
    return this.repo.findOneBy({ data_id: dataId });
  }
}
