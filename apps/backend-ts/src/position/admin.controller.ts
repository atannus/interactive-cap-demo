import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { PartitionService, PartitionMode } from './partition.service';
import { PositionService } from './position.service';

class PartitionDto {
  active: boolean;
  mode: PartitionMode;
}

class PartitionConfigDto {
  autoMode: PartitionMode;
}

const DATA_ID = '1';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly partition: PartitionService,
    private readonly position: PositionService,
  ) {}

  @Post('partition')
  @HttpCode(200)
  set(@Body() dto: PartitionDto) {
    this.partition.set(dto.active, dto.mode);
    return { active: dto.active, mode: dto.mode };
  }

  @Post('partition-config')
  @HttpCode(200)
  setConfig(@Body() dto: PartitionConfigDto) {
    this.partition.setAutoMode(dto.autoMode);
    return { autoMode: dto.autoMode };
  }

  @Get('status')
  status() {
    return this.partition.getStatus();
  }

  @Get('local-state')
  async localState() {
    const pos = await this.position.findOne(DATA_ID);
    if (!pos) return null;
    return { x: pos.x, y: pos.y, updated_at: pos.updated_at, source: 'ts' };
  }
}
