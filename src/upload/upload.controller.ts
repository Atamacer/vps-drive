import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFiles,
  ParseFilePipe,
} from '@nestjs/common';

import { FilesInterceptor } from '@nestjs/platform-express';
import { UploadService, FileMetadata } from './upload.service';

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
  ): Promise<{ message: string; filesData: FileMetadata[] }> {
    return this.uploadService.processFiles(files);
  }
}
