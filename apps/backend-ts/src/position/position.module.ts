import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Position } from './position.entity';
import { PositionController } from './position.controller';
import { PositionService } from './position.service';
import { PositionGateway } from './position.gateway';
import { RedisProvider } from '../redis.provider';
import { PartitionService } from './partition.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Position])],
  controllers: [PositionController, AdminController],
  providers: [PositionService, PositionGateway, RedisProvider, PartitionService],
})
export class PositionModule {}
