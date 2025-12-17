import { Injectable, BadRequestException } from '@nestjs/common';

export interface FileMetadata {
  originalname: string;
  filename: string;
  path: string;
  size: number;
  mimetype: string;
}

@Injectable()
export class UploadService {
  async processFiles(
    files: Array<Express.Multer.File>,
  ): Promise<{ message: string; filesData: FileMetadata[] }> {
    if (!files || files.length === 0) {
      throw new BadRequestException('Необходимо загрузить хотя бы один файл.');
    }

    const filesData: FileMetadata[] = files.map((file) => {
      // filename уже должно быть корректным после editFileName
      // originalname может содержать крякозябры, но мы его не используем
      // для отображения пользователю

      return {
        originalname: file.originalname, // оставляем как есть
        filename: file.filename, // это уже исправленное имя
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
      };
    });

    if (files.length === 1) {
      console.log(`Обработан один файл: ${filesData[0].filename}`);
    } else {
      console.log(
        `Обработано ${files.length} файлов: ${filesData.map((f) => f.filename).join(', ')}`,
      );
    }

    return {
      message: `${files.length} файл(ов) успешно обработано.`,
      filesData: filesData,
    };
  }
}
