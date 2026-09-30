import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("updates")
export class Update {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  bookingId: number;

  @Column()
  note: string;

  @Column({ nullable: true })
  photoPath: string;

  @CreateDateColumn()
  postedAt: Date;
}
