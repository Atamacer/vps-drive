import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UploadModule } from './upload/upload.module';
import { DownloadModule } from './download/download.module';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    AuthModule,
    UploadModule,
    DownloadModule,
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
