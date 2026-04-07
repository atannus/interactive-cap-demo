import { Injectable } from '@nestjs/common';

export type PartitionMode = 'AP' | 'CP';

@Injectable()
export class PartitionService {
  active = false;
  mode: PartitionMode = 'AP';

  set(active: boolean, mode: PartitionMode) {
    this.active = active;
    this.mode = mode;
  }
}
