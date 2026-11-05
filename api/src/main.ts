import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import { AppModule } from './modules/app.module';
import { AppConfig } from './modules/config/config.service';
import { ApiExceptionFilter } from './shared/filters/api-exception.filter';
import { validationPipe } from './shared/pipes/validation.pipe';
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
void bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : '';
  const configurationError = /^(Missing configuration: |Invalid configuration: |WEB_ORIGIN must |FACE_SIMILARITY_THRESHOLD is retired\.)/.test(message);
  console.error(configurationError ? message : 'API startup failed. Check required environment settings, database permissions, and port availability.');
  process.exitCode = 1;
});
