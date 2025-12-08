import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

import { editFileName, UPLOAD_PATH } from './file-naming.utils';

@Module({
  providers: [UploadService],
  controllers: [UploadController],
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: UPLOAD_PATH,
        filename: editFileName,
      }),
    }),
  ],
})
export class UploadModule {}
