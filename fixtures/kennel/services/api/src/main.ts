import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ExposeErrorsFilter } from "./common/expose-errors.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalFilters(new ExposeErrorsFilter());
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
