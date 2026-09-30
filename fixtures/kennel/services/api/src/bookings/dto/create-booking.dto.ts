import { IsDateString, IsString, Length } from "class-validator";

export class CreateBookingDto {
  @IsString()
  @Length(1, 60)
  dogName: string;

  @IsString()
  @Length(15, 15)
  microchip: string;

  @IsDateString()
  checkIn: string;

  @IsDateString()
  checkOut: string;
}
