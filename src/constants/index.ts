/**
 * 项目常量定义
 */

// 应用配置
export const APP_CONFIG = {
  NAME: '备忘录',
  VERSION: '1.0.0',
  DEFAULT_FOLDER_NAME: '备忘录',
  DEFAULT_FOLDER_FTITLE: 'default-folder',
} as const

// 数据库配置
export const DB_CONFIG = {
  NAME: 'note',
  VERSION: 1,
  DELETED_RETENTION_DAYS: 30,
} as const

// 编辑器配置
export const EDITOR_CONFIG = {
  DRAG_HANDLE_WIDTH: 20,
  SCROLL_THRESHOLD: 100,
  DRAG_HANDLE_SELECTOR: '.custom-drag-handle',
  MAX_SMALLTEXT_LENGTH: 255,
} as const

// 文件配置
export const FILE_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  SUPPORTED_DOCUMENT_TYPES: ['application/pdf', 'text/plain'],
} as const

// 路由路径
export const ROUTES = {
  HOME: '/home',
  LOGIN: '/login',
  NOTE_DETAIL: '/n/:uuid',
  FOLDER: '/f/:pathMatch(.*)*',
  DELETED: '/deleted',
} as const

// 笔记类型
export const NOTE_TYPES = {
  NOTE: 'note',
  FOLDER: 'folder',
} as const

// 删除状态
export const DELETE_STATUS = {
  ACTIVE: 0,
  DELETED: 1,
} as const

// 锁定状态
export const LOCK_STATUS = {
  UNLOCKED: 0,
  LOCKED: 1,
} as const

// 错误消息
export const ERROR_MESSAGES = {
  NETWORK_ERROR: '网络连接异常，请检查网络设置',
  DATABASE_ERROR: '数据保存失败，请稍后重试',
  VALIDATION_ERROR: '输入信息有误，请检查后重试',
  PERMISSION_ERROR: '权限不足，无法执行此操作',
  FILE_ERROR: '文件处理失败，请稍后重试',
  SYNC_ERROR: '同步失败，请检查网络连接',
  UNKNOWN_ERROR: '操作失败，请稍后重试',
} as const

// 成功消息
export const SUCCESS_MESSAGES = {
  NOTE_CREATED: '笔记创建成功',
  NOTE_UPDATED: '笔记更新成功',
  NOTE_DELETED: '笔记删除成功',
  NOTE_RESTORED: '笔记恢复成功',
  FOLDER_CREATED: '文件夹创建成功',
  SYNC_SUCCESS: '同步完成',
} as const

// 设备类型
export const DEVICE_TYPES = {
  MOBILE: 'mobile',
  TABLET: 'tablet',
  DESKTOP: 'desktop',
} as const

// 主题模式
export const THEME_MODES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const

// 排序选项
export const SORT_OPTIONS = {
  CREATED_TIME_DESC: 'newstime_desc',
  CREATED_TIME_ASC: 'newstime_asc',
  UPDATED_TIME_DESC: 'lastdotime_desc',
  UPDATED_TIME_ASC: 'lastdotime_asc',
  TITLE_ASC: 'title_asc',
  TITLE_DESC: 'title_desc',
} as const

// 正则表达式
export const REGEX_PATTERNS = {
  SHA256_HASH: /^[a-f0-9]{64}$/i,
  EMAIL: /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
} as const

// 本地存储键名
export const STORAGE_KEYS = {
  USER_PREFERENCES: 'user_preferences',
  THEME_MODE: 'theme_mode',
  LAST_SYNC_TIME: 'last_sync_time',
  EDITOR_SETTINGS: 'editor_settings',
} as const
