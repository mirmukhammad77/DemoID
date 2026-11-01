import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import { AppModule } from './app.module';
import { AppConfig } from './config/config.module';
import { ApiExceptionFilter } from './common/errors';
import { validationPipe } from './common/validation';
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: false, abortOnError: false, bodyParser: false });
  const config = app.get(AppConfig);
  app.use((_request: unknown, response: { setHeader: (key: string, value: string) => void }, next: () => void) => {
    response.setHeader('Cache-Control', 'no-store'); next();
  });
  app.enableCors({ origin: config.webOrigins, methods: ['POST'], credentials: false });
  // Register CORS before parsing so malformed JSON also receives CORS headers.
  app.use(json({ limit: '16kb' }));
  app.setGlobalPrefix('api');
  app.useGlobalPipes(validationPipe());
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();
  await app.listen(config.port, config.host);
  console.log('DemoID API listening at http://' + config.host + ':' + config.port + '/api');
}
void bootstrap().catch(() => { console.error('API startup failed. Check required environment settings, database permissions, and port availability.'); process.exitCode = 1; });
