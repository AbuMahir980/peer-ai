import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Update } from "./update.entity";
import { UpdatesController } from "./updates.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Update])],
  controllers: [UpdatesController],
})
export class UpdatesModule {}
