import { CheckInService } from "../src/vet/check-in.service";
import { VetRecordsClient } from "../src/vet/vet-records.client";

const vet = (vaccinations: { name: string; validUntil: string }[]) =>
  ({ vaccinationsFor: async () => vaccinations }) as unknown as VetRecordsClient;

describe("checking in", () => {
  it("lets a dog in with every vaccination valid on the day", async () => {
    const service = new CheckInService(
      vet([
        { name: "rabies", validUntil: "2027-01-01" },
        { name: "distemper", validUntil: "2027-01-01" },
        { name: "kennel cough", validUntil: "2027-01-01" },
      ]),
    );
    expect(await service.mayCheckIn("985112345678901", "2026-10-01")).toBe(true);
  });

  it("turns a dog away with a vaccination out of date", async () => {
    const service = new CheckInService(vet([{ name: "rabies", validUntil: "2026-09-01" }]));
    expect(await service.mayCheckIn("985112345678901", "2026-10-01")).toBe(false);
  });
});
