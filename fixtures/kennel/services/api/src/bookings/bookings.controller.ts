import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { BookingsService } from "./bookings.service";
import { CreateBookingDto } from "./dto/create-booking.dto";

const NIGHTLY_RATE = 32.5;

@Controller("bookings")
@UseGuards(AuthGuard)
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post()
  create(@Req() req, @Body() dto: CreateBookingDto) {
    const nights = (Date.parse(dto.checkOut) - Date.parse(dto.checkIn)) / 86_400_000;
    const total = nights * NIGHTLY_RATE;
    return this.bookings.create(req.user.id, dto, total);
  }

  @Get()
  list(@Req() req) {
    return this.bookings.listForOwner(req.user.id);
  }

  @Get(":id")
  find(@Param("id") id: string) {
    return this.bookings.find(Number(id));
  }
}
