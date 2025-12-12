import { IsArray, IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class DeleteFilesDto {
  @IsNotEmpty({ message: 'File paths are required' })
  @IsArray({ message: 'File paths must be provided as an array' })
  @IsString({ each: true, message: 'Each file path must be a string' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((f) => f.trim())
        .filter((f) => f.length > 0);
    }
    if (Array.isArray(value)) {
      return value
        .map((f) => (typeof f === 'string' ? f.trim() : String(f)))
        .filter((f) => f.length > 0);
    }
    return value;
  })
  filepaths: string[];
}
