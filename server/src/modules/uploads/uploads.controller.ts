import {
  BadRequestException,
  Controller,
  Logger,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { diskStorage } from 'multer';
import { extname, join, isAbsolute } from 'path';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { ContentCheckService } from '../content/content.service';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_SIZE = parseInt(process.env.MAX_FILE_SIZE || '5242880', 10);
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

@ApiTags('uploads')
@ApiBearerAuth()
@UseGuards(AuthGuard(['jwt', 'admin-jwt']))  // 用户 token 和管理员 token 都放行
@Controller('uploads')
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);

  constructor(private readonly contentCheck: ContentCheckService) {}

  @Post('image')
  @ApiOperation({ summary: '上传图片（含微信内容安全检查）' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) => {
          cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
        },
      }),
      limits: { fileSize: MAX_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED.includes(file.mimetype)) {
          cb(new BadRequestException(`不支持的图片类型：${file.mimetype}`), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async upload(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('未收到文件');

    // UPLOAD_DIR 可能是绝对路径（生产）或相对路径（开发），分别处理
    const filePath = isAbsolute(UPLOAD_DIR)
      ? join(UPLOAD_DIR, file.filename)
      : join(process.cwd(), UPLOAD_DIR, file.filename);

    // 内容安全检查（开发环境自动跳过）
    // 注意：微信同步版 img_sec_check 已弃用且对头像/封面误报率高，
    // 因此图片检查仅记录告警、不硬阻断上传（文本检查仍严格把关）。
    try {
      const check = await this.contentCheck.checkImage(filePath);
      if (!check.safe) {
        this.logger.warn(`图片内容检查未通过（仅记录，不阻断）: ${file.filename} reason=${check.reason ?? '?'}`);
      }
    } catch (e: any) {
      this.logger.warn(`图片内容检查异常（忽略）: ${e?.message}`);
    }

    return {
      url: `/uploads/${file.filename}`,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
    };
  }
}
