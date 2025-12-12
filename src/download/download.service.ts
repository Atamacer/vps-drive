import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as archiver from 'archiver';
import { createReadStream, existsSync, ReadStream, statSync } from 'fs';
import { Response } from 'express';
import { FileInfo } from './interfaces/file-info.interface';

interface ErrnoException extends Error {
  errno?: number;
  code?: string;
  path?: string;
  syscall?: string;
  stack?: string;
}

@Injectable()
export class DownloadService {
  private readonly uploadsDir = './uploads';

  async getFileList(): Promise<FileInfo[]> {
    try {
      await fs.access(this.uploadsDir);

      const files = await fs.readdir(this.uploadsDir);
      const fileInfos: FileInfo[] = [];

      for (const file of files) {
        const filePath = path.join(this.uploadsDir, file);
        const stats = await fs.stat(filePath);

        if (stats.isFile()) {
          fileInfos.push({
            name: file,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            extension: path.extname(file).toLowerCase(),
          });
        }
      }

      return fileInfos.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error: unknown) {
      // Если папки не существует, возвращаем пустой массив
      const err = error as ErrnoException;
      if (err.code === 'ENOENT') {
        return [];
      }
      throw new HttpException(
        'Failed to get file list',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async prepareFilesForDownload(filenames?: string[]): Promise<{
    type: 'single' | 'multiple';
    filename: string;
    stream?: ReadStream;
    archive?: archiver.Archiver;
  }> {
    if (!filenames || filenames.length === 0) {
      const allFiles = await this.getFileList();
      filenames = allFiles.map((f) => f.name);
    }

    const missingFiles: string[] = [];

    for (const filename of filenames) {
      const filePath = path.join(this.uploadsDir, filename);
      if (!existsSync(filePath)) {
        missingFiles.push(filename);
      }
    }

    if (missingFiles.length > 0) {
      throw new HttpException(
        `Files not found: ${missingFiles.join(', ')}`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (filenames.length === 1) {
      const filePath = path.join(this.uploadsDir, filenames[0]);
      const stream = createReadStream(filePath);

      return {
        type: 'single',
        filename: filenames[0],
        stream,
      };
    }

    const archive = archiver('zip', {
      zlib: { level: 9 }, // Максимальное сжатие
    });

    const archiveName = `download_${Date.now()}.zip`;

    for (const filename of filenames) {
      const filePath = path.join(this.uploadsDir, filename);
      archive.file(filePath, { name: filename });
    }

    archive.finalize();

    return {
      type: 'multiple',
      filename: archiveName,
      archive,
    };
  }

  formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  async handleFileDownload(
    filenames: string[] | undefined,
    response: Response,
  ): Promise<void> {
    const result = await this.prepareFilesForDownload(filenames);

    if (result.type === 'single' && result.stream) {
      const filePath = path.join(this.uploadsDir, result.filename);
      const stats = statSync(filePath);

      response.set({
        'Content-Disposition': `attachment; filename="${encodeURIComponent(result.filename)}"`,
        'Content-Type': 'application/octet-stream',
        'Content-Length': stats.size.toString(),
      });

      result.stream.pipe(response);
    } else if (result.type === 'multiple' && result.archive) {
      response.set({
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Content-Type': 'application/zip',
      });

      result.archive.pipe(response);
    } else {
      throw new HttpException(
        'Failed to prepare files for download',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteFiles(filenames: string[]): Promise<{
    success: boolean;
    deleted: string[];
    failed: Array<{ filename: string; error: string }>;
  }> {
    if (!filenames || filenames.length === 0) {
      throw new HttpException(
        'No files specified for deletion',
        HttpStatus.BAD_REQUEST,
      );
    }

    const deleted: string[] = [];
    const failed: Array<{ filename: string; error: string }> = [];

    for (const filename of filenames) {
      try {
        const filePath = path.join(this.uploadsDir, filename);

        if (!existsSync(filePath)) {
          failed.push({
            filename,
            error: 'File not found',
          });
          continue;
        }

        await fs.unlink(filePath);
        deleted.push(filename);
      } catch (error: unknown) {
        const err = error as ErrnoException;
        failed.push({
          filename,
          error: err.message || 'Unknown error',
        });
      }
    }

    if (deleted.length === 0 && failed.length > 0) {
      const errorMessages = failed
        .map((f) => `${f.filename}: ${f.error}`)
        .join(', ');
      throw new HttpException(
        `Failed to delete files: ${errorMessages}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return {
      success: deleted.length > 0,
      deleted,
      failed,
    };
  }
}
