import { Body, Controller, Get, Patch } from '@nestjs/common';
import { PositionService } from './position.service';

const DATA_ID = '1';

class UpdatePositionDto {
  x: number;
  y: number;
}

@Controller('position')
export class PositionController {
  constructor(private readonly service: PositionService) {}

  @Get()
  async get() {
    const pos = await this.service.findOne(DATA_ID);
    if (!pos) return null;
    return { x: pos.x, y: pos.y, updated_at: pos.updated_at };
  }

  @Patch()
  async update(@Body() dto: UpdatePositionDto) {
    const pos = await this.service.upsert(DATA_ID, dto.x, dto.y);
    return { x: pos.x, y: pos.y, updated_at: pos.updated_at };
  }
}
