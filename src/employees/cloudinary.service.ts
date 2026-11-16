import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

export type EmployeeMediaType = 'image' | 'video';

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
}

@Injectable()
export class CloudinaryService {
  private readonly configured: boolean;

  constructor() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    this.configured = Boolean(cloudName && apiKey && apiSecret);

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
    }
  }

  upload(
    buffer: Buffer,
    type: EmployeeMediaType,
  ): Promise<CloudinaryUploadResult> {
    this.ensureConfigured();

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'gravehub/employee-portfolio',
          resource_type: type,
        },
        (error, result) => {
          if (error) {
            reject(new Error(error.message));
            return;
          }

          if (!result) {
            reject(new Error('Cloudinary returned no upload result'));
            return;
          }

          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );

      uploadStream.end(buffer);
    });
  }

  async delete(publicId: string, type: EmployeeMediaType): Promise<void> {
    this.ensureConfigured();

    const result: unknown = await cloudinary.uploader.destroy(publicId, {
      resource_type: type,
      invalidate: true,
    });

    if (
      typeof result !== 'object' ||
      result === null ||
      !('result' in result) ||
      typeof result.result !== 'string'
    ) {
      throw new Error('Cloudinary returned an invalid delete response');
    }

    if (result.result !== 'ok' && result.result !== 'not found') {
      throw new Error(`Cloudinary could not delete media: ${result.result}`);
    }
  }

  private ensureConfigured(): void {
    if (!this.configured) {
      throw new ServiceUnavailableException('Media storage is not configured');
    }
  }
}
