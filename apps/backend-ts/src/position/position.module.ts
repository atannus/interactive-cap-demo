import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Position } from './position.entity';
import { PositionController } from './position.controller';
import { PositionService } from './position.service';
import { PositionGateway } from './position.gateway';
import { RedisProvider } from '../redis.provider';

@Module({
  imports: [TypeOrmModule.forFeature([Position])],
  controllers: [PositionController],
  providers: [PositionService, PositionGateway, RedisProvider],
})
export class PositionModule {}
