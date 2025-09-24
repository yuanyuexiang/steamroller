/**
 * 用户角色和权限配置
 */

// 管理员角色名称列表 - 只有这些角色的用户才能访问管理系统
export const ADMIN_ROLES = [
  'Administrator',
  'Admin', 
  'Super Admin',
  'Super Administrator',
  'admin',
  'administrator',
  '管理员',
  '超级管理员',
  '系统管理员'
] as const;

// 角色类型定义
export type AdminRoleName = typeof ADMIN_ROLES[number];

/**
 * 检查角色名称是否为管理员角色
 * @param roleName - 角色名称
 * @returns 是否为管理员角色
 */
export const isAdminRole = (roleName: string | undefined | null): boolean => {
  if (!roleName) return false;
  return ADMIN_ROLES.includes(roleName as AdminRoleName);
};

/**
 * 检查用户是否具有管理员权限
 * @param user - 用户对象
 * @returns 是否为管理员
 */
export const isUserAdmin = (user: { role?: { name: string } } | null | undefined): boolean => {
  return user?.role?.name ? isAdminRole(user.role.name) : false;
};

// 权限相关的消息文本
export const AUTH_MESSAGES = {
  INSUFFICIENT_PERMISSION: '权限不足：此系统仅限管理员访问',
  LOGIN_SUCCESS: '管理员登录成功',
  ROLE_VERIFIED: '管理员权限验证通过',
  ROLE_CHECK_FAILED: '用户权限验证失败'
} as const;