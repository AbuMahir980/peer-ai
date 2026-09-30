import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Owner } from "./owner.entity";
import { OwnersService } from "./owners.service";

@Module({
  imports: [TypeOrmModule.forFeature([Owner])],
  providers: [OwnersService],
  exports: [OwnersService],
})
export class OwnersModule {}
