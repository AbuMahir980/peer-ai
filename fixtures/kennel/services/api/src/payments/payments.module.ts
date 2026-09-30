import { Module } from "@nestjs/common";
import { BookingsModule } from "../bookings/bookings.module";
import { PaymentsController } from "./payments.controller";

@Module({
  imports: [BookingsModule],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
