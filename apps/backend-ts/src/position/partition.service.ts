import { Injectable } from '@nestjs/common';

export type PartitionMode = 'AP' | 'CP';
export type PartitionSource = 'manual' | 'auto';

@Injectable()
export class PartitionService {
  active = false;
  mode: PartitionMode = 'AP';
  source: PartitionSource = 'manual';
  autoMode: PartitionMode = 'AP';
  redisConnected = true;

  set(active: boolean, mode: PartitionMode) {
    this.active = active;
    this.mode = mode;
    this.source = 'manual';
  }

  setAutoMode(mode: PartitionMode) {
    this.autoMode = mode;
  }

  onRedisDisconnect() {
    this.redisConnected = false;
    if (!this.active) {
      this.active = true;
      this.mode = this.autoMode;
      this.source = 'auto';
    }
  }

  onRedisReconnect() {
    this.redisConnected = true;
    if (this.source === 'auto') {
      this.active = false;
      this.source = 'manual';
    }
  }

  getStatus() {
    return {
      partition: { active: this.active, mode: this.mode, source: this.source },
      redis: { connected: this.redisConnected },
    };
  }
}
