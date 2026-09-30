import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Update } from "../updates/update.entity";
import { Booking } from "./booking.entity";
import { CreateBookingDto } from "./dto/create-booking.dto";

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectRepository(Update) private readonly updates: Repository<Update>,
  ) {}

  create(ownerId: number, dto: CreateBookingDto, total: number) {
    return this.bookings.save({ ...dto, ownerId, total });
  }

  async listForOwner(ownerId: number) {
    const bookings = await this.bookings.find({ where: { ownerId }, order: { checkIn: "DESC" } });
    for (const booking of bookings) {
      booking.updates = await this.updates.count({ where: { bookingId: booking.id } });
    }
    return bookings;
  }

  find(id: number) {
    return this.bookings.findOneByOrFail({ id });
  }

  async markPaid(id: number) {
    await this.bookings.update({ id }, { paid: true });
  }
}
