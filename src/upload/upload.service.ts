import { Injectable, BadRequestException } from '@nestjs/common';

export interface FileMetadata {
  originalname: string;
  filename: string;
  path: string;
}

@Injectable()
export class UploadService {
  async processFiles(
    files: Array<Express.Multer.File>,
  ): Promise<{ message: string; filesData: FileMetadata[] }> {
    if (!files || files.length === 0) {
      throw new BadRequestException('Необходимо загрузить хотя бы один файл.');
    }
    const filesData: FileMetadata[] = files.map((file) => ({
      originalname: file.originalname,
      filename: file.filename,
      path: file.path,
    }));

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
