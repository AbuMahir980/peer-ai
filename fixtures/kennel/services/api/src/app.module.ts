import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BookingsModule } from "./bookings/bookings.module";
import { OwnersModule } from "./owners/owners.module";
import { PaymentsModule } from "./payments/payments.module";
import { UpdatesModule } from "./updates/updates.module";
import { VetModule } from "./vet/vet.module";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      url: process.env.DATABASE_URL,
      password: process.env.DATABASE_PASSWORD ?? "kennel-db-2026",
      autoLoadEntities: true,
      synchronize: true,
    }),
    JwtModule.register({ global: true, secret: process.env.JWT_SECRET }),
    BookingsModule,
    OwnersModule,
    PaymentsModule,
    UpdatesModule,
    VetModule,
  ],
})
export class AppModule {}
