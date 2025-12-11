import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as archiver from 'archiver';
import { createReadStream, existsSync, ReadStream, statSync } from 'fs';
import { FileInfo } from './interfaces/file-info.interface';

@Injectable()
export class DownloadService {
  private readonly uploadsDir = './uploads';

  /**
   * Получить список всех файлов в папке uploads
   */
  async getFileList(): Promise<FileInfo[]> {
    try {
      // Проверяем существование папки
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
    } catch (error) {
      // Если папки не существует, возвращаем пустой массив
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Скачать один файл
   */
  async downloadSingleFile(
    filename: string,
  ): Promise<{ stream: ReadStream; filename: string }> {
    const filePath = path.join(this.uploadsDir, filename);

    if (!existsSync(filePath)) {
      throw new HttpException(
        `File ${filename} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const stream = createReadStream(filePath);
    return { stream, filename };
  }

  /**
   * Скачать несколько файлов в ZIP-архиве
   */
  async downloadMultipleFiles(
    filenames: string[],
  ): Promise<{ archive: archiver.Archiver; archiveName: string }> {
    // Проверяем существование всех файлов
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

    // Создаем архив
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Максимальное сжатие
    });

    const archiveName = `download_${Date.now()}.zip`;

    // Добавляем файлы в архив
    for (const filename of filenames) {
      const filePath = path.join(this.uploadsDir, filename);
      archive.file(filePath, { name: filename });
    }

    // Завершаем архив
    archive.finalize();

    return { archive, archiveName };
  }

  /**
   * Универсальный метод для скачивания файлов
   */
  async downloadFiles(filenames?: string[]) {
    // Если не указаны файлы, скачиваем все
    if (!filenames || filenames.length === 0) {
      const allFiles = await this.getFileList();
      filenames = allFiles.map((f) => f.name);
    }

    // Если файл один - отдаем как есть
    if (filenames.length === 1) {
      return this.downloadSingleFile(filenames[0]);
    }

    // Если файлов несколько - создаем архив
    return this.downloadMultipleFiles(filenames);
  }

  /**
   * Проверить существование файла
   */
  async fileExists(filename: string): Promise<boolean> {
    const filePath = path.join(this.uploadsDir, filename);
    try {
      await fs.access(filePath);
      const stats = await fs.stat(filePath);
      return stats.isFile();
    } catch {
      return false;
    }
  }

  /**
   * Получить размер файла
   */
  getFileSize(filename: string): number {
    const filePath = path.join(this.uploadsDir, filename);
    if (!existsSync(filePath)) {
      throw new HttpException(
        `File ${filename} not found`,
        HttpStatus.NOT_FOUND,
      );
    }
    return statSync(filePath).size;
  }
}
