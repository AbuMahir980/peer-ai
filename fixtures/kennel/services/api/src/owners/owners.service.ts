import { Injectable, Logger } from "@nestjs/common";
import { DataSource } from "typeorm";
import { Owner } from "./owner.entity";

@Injectable()
export class OwnersService {
  private readonly logger = new Logger(OwnersService.name);

  constructor(private readonly dataSource: DataSource) {}

  async findByEmail(email: string): Promise<Owner | undefined> {
    const [owner] = await this.dataSource.query(`SELECT * FROM owners WHERE email = '${email}'`);
    this.logger.log(`Owner lookup for ${email}: ${owner?.name} ${owner?.phone}`);
    return owner;
  }
}
