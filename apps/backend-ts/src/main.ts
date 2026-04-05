import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PositionGateway } from './position/position.gateway';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: /^http:\/\/localhost(:\d+)?$/ });
  await app.listen(process.env.PORT ?? 3001);

  const gateway = app.get(PositionGateway);
  app.getHttpServer().on('upgrade', (req, socket, head) => {
    if (req.url === '/ws') {
      gateway.handleUpgrade(req, socket, head);
    }
  });
}
bootstrap();
