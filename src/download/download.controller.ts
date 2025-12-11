import {
  BadRequestException,
  Controller,
  Get,
  Header,
  HttpException,
  NotFoundException,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { Readable } from 'stream';
import { DownloadService } from './download.service';
import { DownloadFilesDto } from './dto/download-files.dto';

@Controller('download')
export class DownloadController {
  constructor(private readonly downloadService: DownloadService) {}

  /**
   * Получить список файлов
   * GET /download/list
   */
  @Get('list')
  async getFileList() {
    try {
      const files = await this.downloadService.getFileList();
      return {
        success: true,
        count: files.length,
        files: files.map((file) => ({
          name: file.name,
          size: this.formatBytes(file.size),
          created: file.created.toISOString(),
          modified: file.modified.toISOString(),
          extension: file.extension,
          url: `/download/file?filename=${encodeURIComponent(file.name)}`,
          downloadUrl: `/download/files?filenames=${encodeURIComponent(file.name)}`,
        })),
      };
    } catch {
      throw new BadRequestException('Failed to get file list');
    }
  }

  /**
   * Скачать один файл (альтернативный endpoint)
   * GET /download/file?filename=example.jpg
   */
  @Get('file')
  @Header('Content-Type', 'application/octet-stream')
  async downloadFile(
    @Query('filename') filename: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    if (!filename) {
      throw new BadRequestException('Filename is required');
    }

    try {
      const file = await this.downloadService.downloadSingleFile(filename);

      // Преобразуем NodeJS.ReadableStream в Readable
      const readableStream = Readable.from(file.stream);

      // Устанавливаем заголовки для скачивания
      res.set({
        'Content-Disposition': `attachment; filename="${encodeURIComponent(file.filename)}"`,
        'Content-Type': 'application/octet-stream',
      });

      return new StreamableFile(readableStream);
    } catch (error: unknown) {
      if (error instanceof HttpException && error.getStatus() === 404) {
        throw new NotFoundException(`File ${filename} not found`);
      }
      throw new BadRequestException('Failed to download file');
    }
  }

  /**
   * Основной endpoint для скачивания файлов
   * GET /download/files?filenames=file1.jpg,file2.pdf
   * GET /download/files (скачает все файлы)
   */
  @Get('files')
  async downloadFiles(
    @Query() dto: DownloadFilesDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const result = await this.downloadService.downloadFiles(dto.filenames);

      // Если это один файл
      if ('stream' in result) {
        res.set({
          'Content-Disposition': `attachment; filename="${encodeURIComponent(result.filename)}"`,
          'Content-Type': 'application/octet-stream',
        });

        // Преобразуем NodeJS.ReadableStream в Readable и передаем в response
        const readableStream = Readable.from(result.stream);
        readableStream.pipe(res);
      }
      // Если это архив с несколькими файлами
      else if ('archive' in result) {
        res.set({
          'Content-Disposition': `attachment; filename="${result.archiveName}"`,
          'Content-Type': 'application/zip',
        });
        result.archive.pipe(res);
      }
    } catch (error: unknown) {
      if (error instanceof HttpException && error.getStatus() === 404) {
        const errorMessage = error.getResponse();
        throw new NotFoundException(
          typeof errorMessage === 'object'
            ? (errorMessage as any).message || errorMessage
            : errorMessage,
        );
      }
      throw new BadRequestException('Failed to download files');
    }
  }

  /**
   * Вспомогательный метод для форматирования размера файла
   */
  private formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}
