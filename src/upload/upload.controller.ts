import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFiles,
  ParseFilePipe,
} from '@nestjs/common';

import { FilesInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('files')
  @UseInterceptors(FilesInterceptor('fileOrFiles', 10))
  async uploadAnyFiles(
    @UploadedFiles(
      new ParseFilePipe({
        fileIsRequired: false,
      }),
    )
    files: Array<Express.Multer.File>,
  ) {
    return this.uploadService.processFiles(files);
  }
}
