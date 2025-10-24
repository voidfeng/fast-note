/**
 * PocketBase 服务统一导出
 */

// 导出各个服务
export { authService } from './auth'

// 兼容旧的导出名称（方便迁移）
export { authService as authApi } from './auth'
// 导出客户端实例和工具函数
export { mapErrorMessage, pb } from './client'
export { filesService } from './files'
export { filesService as filesApi } from './files'

export { notesService } from './notes'
export { notesService as notesApi } from './notes'
export { usersService } from './users'
export { usersService as userApi } from './users'
