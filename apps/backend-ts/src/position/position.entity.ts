import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('positions')
export class Position {
  @PrimaryColumn()
  data_id: string;

  @Column('double precision')
  x: number;

  @Column('double precision')
  y: number;

  @UpdateDateColumn()
  updated_at: Date;
}
