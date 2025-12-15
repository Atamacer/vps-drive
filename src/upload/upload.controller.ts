import {
  Controller,
  ParseFilePipe,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { FilesInterceptor } from '@nestjs/platform-express';
import { FileMetadata, UploadService } from './upload.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('upload')
@UseGuards(AuthGuard('jwt'))
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
