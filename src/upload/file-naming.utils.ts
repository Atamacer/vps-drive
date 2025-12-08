import * as fs from 'fs';
import * as path from 'path';

const UPLOAD_PATH = './uploads';

export const editFileName = (req, file, callback) => {
  const originalName = file.originalname;
  const name = path.parse(originalName).name;
  const extension = path.parse(originalName).ext;

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
