import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Position } from './position.entity';

@Injectable()
export class PositionService {
  constructor(
    @InjectRepository(Position)
    private readonly repo: Repository<Position>,
  ) {}

  async upsert(boxId: string, x: number, y: number): Promise<Position> {
    await this.repo.upsert({ box_id: boxId, x, y }, ['box_id']);
    return this.repo.findOneByOrFail({ box_id: boxId });
  }

  findOne(boxId: string): Promise<Position | null> {
    return this.repo.findOneBy({ box_id: boxId });
  }
}
