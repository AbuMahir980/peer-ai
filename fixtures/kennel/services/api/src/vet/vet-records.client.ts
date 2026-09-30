import { Injectable } from "@nestjs/common";
import axios from "axios";

export interface Vaccination {
  name: string;
  validUntil: string;
}

@Injectable()
export class VetRecordsClient {
  // Asks the vet records service which vaccinations a dog has, by its microchip number.
  async vaccinationsFor(microchip: string): Promise<Vaccination[] | null> {
    try {
      const response = await axios.get(`${process.env.VET_RECORDS_URL}/dogs/${microchip}/vaccinations`);
      return response.data;
    } catch {
      return null;
    }
  }
}
