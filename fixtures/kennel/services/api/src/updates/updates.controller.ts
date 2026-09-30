import { Body, Controller, Param, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { InjectRepository } from "@nestjs/typeorm";
import { diskStorage } from "multer";
import { Repository } from "typeorm";
import { AuthGuard } from "../auth/auth.guard";
import { Update } from "./update.entity";

@Controller("bookings/:bookingId/updates")
@UseGuards(AuthGuard)
export class UpdatesController {
  constructor(@InjectRepository(Update) private readonly updates: Repository<Update>) {}

  // Staff post a daily update on a stay, with a photo of the dog.
  @Post()
  @UseInterceptors(
    FileInterceptor("photo", {
      storage: diskStorage({
        destination: "uploads",
        filename: (_req, file, done) => done(null, file.originalname),
      }),
    }),
  )
  post(@Param("bookingId") bookingId: string, @Body("note") note: string, @UploadedFile() photo: Express.Multer.File) {
    return this.updates.save({ bookingId: Number(bookingId), note, photoPath: photo?.path });
  }
}
