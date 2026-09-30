import { Body, Controller, Post } from "@nestjs/common";
import { BookingsService } from "../bookings/bookings.service";

interface PaymentEvent {
  type: string;
  bookingId: number;
}

@Controller("payments")
export class PaymentsController {
  constructor(private readonly bookings: BookingsService) {}

  // Called by the payment provider when a deposit is taken.
  @Post("webhook")
  async webhook(@Body() event: PaymentEvent) {
    if (event.type === "payment.succeeded") await this.bookings.markPaid(event.bookingId);
    return { received: true };
  }
}
