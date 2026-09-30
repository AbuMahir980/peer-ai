import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("bookings")
export class Booking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ownerId: number;

  @Column()
  dogName: string;

  @Column()
  microchip: string;

  @Column({ type: "date" })
  checkIn: string;

  @Column({ type: "date" })
  checkOut: string;

  @Column({ type: "float" })
  total: number;

  @Column({ default: false })
  paid: boolean;

  updates?: number;
}
