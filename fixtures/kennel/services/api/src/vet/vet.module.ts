import { Module } from "@nestjs/common";
import { CheckInService } from "./check-in.service";
import { VetRecordsClient } from "./vet-records.client";

@Module({
  providers: [VetRecordsClient, CheckInService],
  exports: [CheckInService],
})
export class VetModule {}
