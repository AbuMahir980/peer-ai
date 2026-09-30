import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Update } from "../updates/update.entity";
import { Booking } from "./booking.entity";
import { BookingsController } from "./bookings.controller";
import { BookingsService } from "./bookings.service";

@Module({
  imports: [TypeOrmModule.forFeature([Booking, Update])],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
