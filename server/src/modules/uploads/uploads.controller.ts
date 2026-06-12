import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
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

    const filePath = join(process.cwd(), UPLOAD_DIR, file.filename);

    // 内容安全检查（开发环境自动跳过）
    const check = await this.contentCheck.checkImage(filePath);
    if (!check.safe) {
      // 删除违规文件，不保留在服务器
      try { unlinkSync(filePath); } catch { /* ignore */ }
      throw new BadRequestException('图片包含违规内容，请更换后重新上传');
    }

    return {
      url: `/uploads/${file.filename}`,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
    };
  }
}
