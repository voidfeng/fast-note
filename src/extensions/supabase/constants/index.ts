// 认证相关常量
export const AUTH_CONSTANTS = {
  // 存储键名
  STORAGE_KEYS: {
    USER: 'supabase.auth.user',
    SESSION: 'supabase.auth.session',
  },

  // 路由路径
  ROUTES: {
    LOGIN: '/supabase/login',
    AUTH_LOGIN: '/auth/login',
    PROFILE: '/supabase/profile',
  },

  // 事件名称
  EVENTS: {
    AUTH_STATE_CHANGE: 'supabase.auth.state.change',
    LOGIN_SUCCESS: 'supabase.auth.login.success',
    LOGOUT_SUCCESS: 'supabase.auth.logout.success',
  },

  // 错误消息
  ERRORS: {
    INVALID_CREDENTIALS: '邮箱或密码错误',
    USER_NOT_FOUND: '用户不存在',
    EMAIL_NOT_CONFIRMED: '邮箱未验证',
    WEAK_PASSWORD: '密码强度不够',
    EMAIL_ALREADY_EXISTS: '邮箱已存在',
    INVALID_OTP: '验证码错误或已过期',
    OTP_SEND_FAILED: '验证码发送失败',
  },

  // 配置
  CONFIG: {
    OTP_EXPIRY: 300, // 5分钟
    PASSWORD_MIN_LENGTH: 6,
    RESEND_COOLDOWN: 60, // 1分钟
  },
} as const

// 组件名称常量
export const COMPONENT_NAMES = {
  LOGIN_PAGE: 'SupabaseLoginPage',
  USER_PROFILE: 'SupabaseUserProfile',
} as const

// API 端点常量
export const API_ENDPOINTS = {
  AUTH: {
    SIGN_IN: 'auth/signin',
    SIGN_UP: 'auth/signup',
    SIGN_OUT: 'auth/signout',
    RESET_PASSWORD: 'auth/reset',
    SEND_OTP: 'auth/otp',
    VERIFY_OTP: 'auth/verify',
  },
} as const

// 登录模式常量
export const LOGIN_MODES = {
  PASSWORD: 'password',
  REGISTER: 'register',
  OTP: 'otp',
} as const

// 数据库表名常量
export const TABLE_NAMES = {
  USERS: 'users',
  PROFILES: 'profiles',
  SESSIONS: 'sessions',
} as const

// 文件存储相关常量
export const STORAGE_CONSTANTS = {
  BUCKETS: {
    AVATARS: 'avatars',
    DOCUMENTS: 'documents',
    IMAGES: 'images',
  },
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'text/plain', 'application/msword'],
} as const
