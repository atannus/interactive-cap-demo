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

  async upsert(boxId: string, x: number, y: number): Promise<Position> {
    await this.repo.upsert({ box_id: boxId, x, y }, ['box_id']);
    const position = await this.repo.findOneByOrFail({ box_id: boxId });
    await this.redis.publish(POSITION_CHANNEL, JSON.stringify(position));
    this.metrics.redisPublishedTotal.inc();
    return position;
  }

  findOne(boxId: string): Promise<Position | null> {
    return this.repo.findOneBy({ box_id: boxId });
  }
}
