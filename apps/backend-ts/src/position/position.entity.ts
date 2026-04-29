import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('positions_ts')
export class Position {
  @PrimaryColumn()
  data_id: string;

  @Column('double precision')
  x: number;

  @Column('double precision')
  y: number;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
