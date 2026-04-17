import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ClientModule } from '../client/client.module';
import { DevicesModule } from '../devices/devices.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionAuthGuard } from './guards/session-auth.guard';

@Module({
  imports: [
    ClientModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
    DevicesModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, SessionAuthGuard],
  exports: [AuthService, ClientModule, JwtModule, SessionAuthGuard],
})
export class AuthModule {}
