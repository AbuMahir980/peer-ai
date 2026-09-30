import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("owners")
export class Owner {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column()
  phone: string;

  @Column()
  passwordHash: string;
}
