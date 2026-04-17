import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ClientConfigService } from './client/client-config.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const clientConfigService = app.get(ClientConfigService);
  const host = configService.getOrThrow<string>('HOST');
  const port = configService.getOrThrow<number>('PORT');

  app.use(cookieParser());
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      if (clientConfigService.isOriginAllowed(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: false,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(port, host);
}
void bootstrap();
