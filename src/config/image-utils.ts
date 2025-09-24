/**
 * 图片处理通用工具函数
 */

import { FILE_CONFIG } from '@lib/api';
import type { ImageConfig } from './image-configs';

/**
 * 安全地从不同格式的图片数据中获取第一张图片的URL
 * @param images - 图片数据，可能是字符串、数组、JSON字符串或null
 * @param config - 图片配置参数
 * @returns 图片URL或null
 */
export function getImageUrl(images: any, config: ImageConfig): string | null {
  if (!images) return null;
  
  // 如果已经是数组，直接取第一个
  if (Array.isArray(images)) {
    const firstImage = images[0];
    return firstImage ? FILE_CONFIG.getAssetUrl(firstImage, undefined, config) : null;
  }
  
  // 如果是字符串，尝试各种解析方式
  if (typeof images === 'string') {
    // 如果包含逗号，可能是多个ID用逗号分隔
    if (images.includes(',')) {
      const firstImageId = images.split(',')[0].trim();
      return firstImageId ? FILE_CONFIG.getAssetUrl(firstImageId, undefined, config) : null;
    }
    
    // 尝试解析JSON
    try {
      const imageArray = JSON.parse(images);
      const imageId = Array.isArray(imageArray) ? imageArray[0] : imageArray;
      return imageId ? FILE_CONFIG.getAssetUrl(imageId, undefined, config) : null;
    } catch (e) {
      // 如果解析失败，直接使用字符串作为图片ID
      return FILE_CONFIG.getAssetUrl(images, undefined, config);
    }
  }
  
  // 其他情况，尝试直接使用
  return FILE_CONFIG.getAssetUrl(String(images), undefined, config);
}

/**
 * 获取产品主图URL的便捷函数
 * @param mainImage - 产品主图数据
 * @param config - 图片配置参数
 * @returns 图片URL或null
 */
export function getProductMainImageUrl(mainImage: any, config: ImageConfig): string | null {
  return getImageUrl(mainImage, config);
}

/**
 * 获取店铺logo URL的便捷函数
 * @param logo - 店铺logo数据
 * @param config - 图片配置参数
 * @returns 图片URL或null
 */
export function getBoutiqueLogoUrl(logo: any, config: ImageConfig): string | null {
  return getImageUrl(logo, config);
}