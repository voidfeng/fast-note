// 重新导出 sync 扩展中的认证功能，保持向后兼容
export { cookieKey, type UserInfo, useAuth as useUserInfo } from '@/extensions/sync/hooks/useAuth'
