import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  NotFoundException,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { DownloadService } from './download.service';
import { DownloadFilesDto } from './dto/download-files.dto';
import { DeleteFilesDto } from './dto/delete-files.dto';

@Controller('download')
export class DownloadController {
  constructor(private readonly downloadService: DownloadService) {}

  @Get('list')
  async getFileList() {
    try {
      const files = await this.downloadService.getFileList();

      const formattedFiles = files.map((file) => ({
        name: file.name,
        size: this.downloadService.formatBytes(file.size),
        created: file.created.toISOString(),
        modified: file.modified.toISOString(),
        extension: file.extension,
        downloadUrl: `/download?filenames=${encodeURIComponent(file.name)}`,
      }));

      return {
        success: true,
        count: files.length,
        files: formattedFiles,
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException('Failed to get file list');
    }
  }

  @Get()
  async downloadFiles(
    @Query() dto: DownloadFilesDto,
    @Res() response: Response,
  ): Promise<void> {
    try {
      await this.downloadService.handleFileDownload(dto.filenames, response);
    } catch (error: unknown) {
      // Обработка ошибок с правильной типизацией
      if (error instanceof HttpException) {
        if (error.getStatus() === 404) {
          throw new NotFoundException(error.message);
        }
        throw error;
      }

      throw new BadRequestException('Failed to download files');
    }
  }

  @Delete()
  async deleteFiles(@Body() deleteFilesDto: DeleteFilesDto) {
    try {
      const result = await this.downloadService.deleteFiles(
        deleteFilesDto.filepaths,
      );

      return {
        success: result.success,
        message:
          result.deleted.length > 0
            ? `Successfully deleted ${result.deleted.length} file(s)`
            : 'No files were deleted',
        deleted: result.deleted,
        failed: result.failed.length > 0 ? result.failed : undefined,
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        if (error.getStatus() === 404) {
          throw new NotFoundException(error.message);
        }
        throw error;
      }

      throw new BadRequestException('Failed to delete files');
    }
  }
}
