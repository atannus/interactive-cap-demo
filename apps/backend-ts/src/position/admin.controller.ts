import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { PartitionService, PartitionMode } from './partition.service';

class PartitionDto {
  active: boolean;
  mode: PartitionMode;
}

@Controller('admin')
export class AdminController {
  constructor(private readonly partition: PartitionService) {}

  @Post('partition')
  @HttpCode(200)
  set(@Body() dto: PartitionDto) {
    this.partition.set(dto.active, dto.mode);
    return { active: dto.active, mode: dto.mode };
  }
}
