import * as fs from 'fs';
import * as path from 'path';
import { Request } from 'express';

const UPLOAD_PATH = './uploads';

type EditFileNameCallback = (error: Error | null, filename: string) => void;

export const editFileName = (
  _req: Request,
  file: Express.Multer.File,
  callback: EditFileNameCallback,
): void => {
  let originalName = file.originalname;

  if (/[�?]/.test(originalName) || /[^\x00-\x7F]/.test(originalName)) {
    try {
      originalName = Buffer.from(originalName, 'binary').toString('utf8');
    } catch (e) {
      console.warn('Не удалось декодировать имя файла:', originalName);
    }
  }

  const parsedPath = path.parse(originalName);
  const name: string = parsedPath.name;
  const extension: string = parsedPath.ext;

  let fileName = originalName;
  let counter = 1;
  let filePath = path.join(UPLOAD_PATH, fileName);

  while (fs.existsSync(filePath)) {
    fileName = `${name}(${counter})${extension}`;
    filePath = path.join(UPLOAD_PATH, fileName);
    counter++;
  }

  callback(null, fileName);
};

export { UPLOAD_PATH };
