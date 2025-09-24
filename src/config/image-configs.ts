// 图片配置类型定义
export interface ImageConfig {
  width: number;
  height: number;
  quality: number;
  fit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  format: 'auto' | 'webp' | 'png' | 'jpg' | 'jpeg';
}

// 图片尺寸配置 - 统一管理应用中的图片尺寸设置
export const IMAGE_CONFIGS = {
  // 缩略图配置（用于列表、卡片等小图）
  THUMBNAIL: {
    width: 80,      // 40px display * 2 for retina
    height: 80,
    quality: 80,
    fit: 'cover' as const,
    format: 'webp' as const
  },
  
  // 小头像配置（用于用户头像、小图标）
  AVATAR_SMALL: {
    width: 64,      // 32px display * 2 for retina
    height: 64,
    quality: 85,
    fit: 'cover' as const,
    format: 'webp' as const
  },
  
  // 中等尺寸预览图（用于详情页、弹窗预览）
  PREVIEW_MEDIUM: {
    width: 160,     // 80px display * 2 for retina
    height: 160,
    quality: 85,
    fit: 'cover' as const,
    format: 'webp' as const
  },
  
  // 大预览图（用于产品详情、完整展示）
  PREVIEW_LARGE: {
    width: 400,     // 200px display * 2 for retina
    height: 400,
    quality: 90,
    fit: 'cover' as const,
    format: 'webp' as const
  },
  
  // 轮播图配置（用于首页轮播、产品画廊）
  CAROUSEL: {
    width: 800,     // 400px display * 2 for retina
    height: 600,
    quality: 92,
    fit: 'cover' as const,
    format: 'webp' as const
  },
  
  // 列表页商品图
  PRODUCT_LIST: {
    width: 120,     // 60px display * 2 for retina
    height: 120,
    quality: 80,
    fit: 'cover' as const,
    format: 'webp' as const
  },
  
  // 店铺列表图
  BOUTIQUE_LIST: {
    width: 128,     // 64px display * 2 for retina
    height: 128,
    quality: 80,
    fit: 'cover' as const,
    format: 'webp' as const
  },
  
  // 排名展示小图（数据总览页面）
  RANKING_THUMB: {
    width: 96,      // 48px display * 2 for retina
    height: 96,
    quality: 80,
    fit: 'cover' as const,
    format: 'webp' as const
  }
};