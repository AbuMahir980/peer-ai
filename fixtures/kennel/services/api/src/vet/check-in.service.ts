import { Injectable } from "@nestjs/common";
import { VetRecordsClient } from "./vet-records.client";

const REQUIRED = ["rabies", "distemper", "kennel cough"];

@Injectable()
export class CheckInService {
  constructor(private readonly vet: VetRecordsClient) {}

  // Whether a dog may be checked in: every required vaccination is valid on the check-in day.
  async mayCheckIn(microchip: string, checkIn: string): Promise<boolean> {
    const vaccinations = await this.vet.vaccinationsFor(microchip);
    if (vaccinations === null) return true;
    return REQUIRED.every((name) =>
      vaccinations.some((vaccination) => vaccination.name === name && vaccination.validUntil >= checkIn),
    );
  }
}
