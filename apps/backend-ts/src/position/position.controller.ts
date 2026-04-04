import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { PositionService } from './position.service';

class UpdatePositionDto {
  x: number;
  y: number;
}

@Controller('position')
export class PositionController {
  constructor(private readonly service: PositionService) {}

  @Get(':boxId')
  get(@Param('boxId') boxId: string) {
    return this.service.findOne(boxId);
  }

  @Patch(':boxId')
  update(@Param('boxId') boxId: string, @Body() dto: UpdatePositionDto) {
    return this.service.upsert(boxId, dto.x, dto.y);
  }
}
