/**
 * MIME类型工具模块
 * 提供统一的文件类型检测、分类和处理功能
 */

// 常用MIME类型常量
export const MIME_TYPES = {
  // 图片类型
  IMAGE: {
    JPEG: 'image/jpeg',
    PNG: 'image/png',
    GIF: 'image/gif',
    WEBP: 'image/webp',
    SVG: 'image/svg+xml',
    BMP: 'image/bmp',
    ICO: 'image/x-icon',
    TIFF: 'image/tiff',
  },

  // 文档类型
  DOCUMENT: {
    PDF: 'application/pdf',
    DOC: 'application/msword',
    DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    XLS: 'application/vnd.ms-excel',
    XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    PPT: 'application/vnd.ms-powerpoint',
    PPTX: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    RTF: 'application/rtf',
    TXT: 'text/plain',
    CSV: 'text/csv',
  },

  // 音频类型
  AUDIO: {
    MP3: 'audio/mpeg',
    WAV: 'audio/wav',
    OGG: 'audio/ogg',
    AAC: 'audio/aac',
    FLAC: 'audio/flac',
    M4A: 'audio/mp4',
  },

  // 视频类型
  VIDEO: {
    MP4: 'video/mp4',
    AVI: 'video/x-msvideo',
    MOV: 'video/quicktime',
    WMV: 'video/x-ms-wmv',
    FLV: 'video/x-flv',
    WEBM: 'video/webm',
    MKV: 'video/x-matroska',
  },

  // 压缩文件类型
  ARCHIVE: {
    ZIP: 'application/zip',
    RAR: 'application/vnd.rar',
    TAR: 'application/x-tar',
    GZIP: 'application/gzip',
    SEVEN_ZIP: 'application/x-7z-compressed',
  },

  // 其他类型
  OTHER: {
    JSON: 'application/json',
    XML: 'application/xml',
    HTML: 'text/html',
    CSS: 'text/css',
    JS: 'application/javascript',
    PSD: 'image/vnd.adobe.photoshop',
  },
} as const

// 文件类别枚举
export enum FileCategory {
  IMAGE = 'image',
  DOCUMENT = 'document',
  AUDIO = 'audio',
  VIDEO = 'video',
  ARCHIVE = 'archive',
  OTHER = 'other',
}

// 文件类型映射
const MIME_TO_CATEGORY_MAP = new Map<string, FileCategory>([
  // 图片类型
  ...Object.values(MIME_TYPES.IMAGE).map(mime => [mime, FileCategory.IMAGE] as const),

  // 文档类型
  ...Object.values(MIME_TYPES.DOCUMENT).map(mime => [mime, FileCategory.DOCUMENT] as const),

  // 音频类型
  ...Object.values(MIME_TYPES.AUDIO).map(mime => [mime, FileCategory.AUDIO] as const),

  // 视频类型
  ...Object.values(MIME_TYPES.VIDEO).map(mime => [mime, FileCategory.VIDEO] as const),

  // 压缩文件类型
  ...Object.values(MIME_TYPES.ARCHIVE).map(mime => [mime, FileCategory.ARCHIVE] as const),
])

// 文件扩展名到MIME类型的映射
const EXTENSION_TO_MIME_MAP = new Map<string, string>([
  // 图片
  ['jpg', MIME_TYPES.IMAGE.JPEG],
  ['jpeg', MIME_TYPES.IMAGE.JPEG],
  ['png', MIME_TYPES.IMAGE.PNG],
  ['gif', MIME_TYPES.IMAGE.GIF],
  ['webp', MIME_TYPES.IMAGE.WEBP],
  ['svg', MIME_TYPES.IMAGE.SVG],
  ['bmp', MIME_TYPES.IMAGE.BMP],
  ['ico', MIME_TYPES.IMAGE.ICO],
  ['tiff', MIME_TYPES.IMAGE.TIFF],
  ['tif', MIME_TYPES.IMAGE.TIFF],

  // 文档
  ['pdf', MIME_TYPES.DOCUMENT.PDF],
  ['doc', MIME_TYPES.DOCUMENT.DOC],
  ['docx', MIME_TYPES.DOCUMENT.DOCX],
  ['xls', MIME_TYPES.DOCUMENT.XLS],
  ['xlsx', MIME_TYPES.DOCUMENT.XLSX],
  ['ppt', MIME_TYPES.DOCUMENT.PPT],
  ['pptx', MIME_TYPES.DOCUMENT.PPTX],
  ['rtf', MIME_TYPES.DOCUMENT.RTF],
  ['txt', MIME_TYPES.DOCUMENT.TXT],
  ['csv', MIME_TYPES.DOCUMENT.CSV],

  // 音频
  ['mp3', MIME_TYPES.AUDIO.MP3],
  ['wav', MIME_TYPES.AUDIO.WAV],
  ['ogg', MIME_TYPES.AUDIO.OGG],
  ['aac', MIME_TYPES.AUDIO.AAC],
  ['flac', MIME_TYPES.AUDIO.FLAC],
  ['m4a', MIME_TYPES.AUDIO.M4A],

  // 视频
  ['mp4', MIME_TYPES.VIDEO.MP4],
  ['avi', MIME_TYPES.VIDEO.AVI],
  ['mov', MIME_TYPES.VIDEO.MOV],
  ['wmv', MIME_TYPES.VIDEO.WMV],
  ['flv', MIME_TYPES.VIDEO.FLV],
  ['webm', MIME_TYPES.VIDEO.WEBM],
  ['mkv', MIME_TYPES.VIDEO.MKV],

  // 压缩文件
  ['zip', MIME_TYPES.ARCHIVE.ZIP],
  ['rar', MIME_TYPES.ARCHIVE.RAR],
  ['tar', MIME_TYPES.ARCHIVE.TAR],
  ['gz', MIME_TYPES.ARCHIVE.GZIP],
  ['7z', MIME_TYPES.ARCHIVE.SEVEN_ZIP],

  // 其他
  ['json', MIME_TYPES.OTHER.JSON],
  ['xml', MIME_TYPES.OTHER.XML],
  ['html', MIME_TYPES.OTHER.HTML],
  ['css', MIME_TYPES.OTHER.CSS],
  ['js', MIME_TYPES.OTHER.JS],
  ['psd', MIME_TYPES.OTHER.PSD],
])

/**
 * 根据MIME类型获取文件类别
 */
export function getFileCategoryByMimeType(mimeType: string): FileCategory {
  return MIME_TO_CATEGORY_MAP.get(mimeType) || FileCategory.OTHER
}

/**
 * 根据文件扩展名获取MIME类型
 */
export function getMimeTypeByExtension(extension: string): string | undefined {
  return EXTENSION_TO_MIME_MAP.get(extension.toLowerCase())
}

/**
 * 从文件名获取扩展名
 */
export function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.')
  return lastDotIndex > 0 ? filename.slice(lastDotIndex + 1).toLowerCase() : ''
}

/**
 * 根据文件名获取MIME类型
 */
export function getMimeTypeByFilename(filename: string): string | undefined {
  const extension = getFileExtension(filename)
  return getMimeTypeByExtension(extension)
}

/**
 * 根据文件名获取文件类别
 */
export function getFileCategoryByFilename(filename: string): FileCategory {
  const mimeType = getMimeTypeByFilename(filename)
  return mimeType ? getFileCategoryByMimeType(mimeType) : FileCategory.OTHER
}

/**
 * 检查文件是否为图片类型
 */
export function isImageFile(file: File | string): boolean {
  const mimeType = typeof file === 'string'
    ? getMimeTypeByFilename(file)
    : file.type

  return mimeType ? getFileCategoryByMimeType(mimeType) === FileCategory.IMAGE : false
}

/**
 * 检查文件是否为文档类型
 */
export function isDocumentFile(file: File | string): boolean {
  const mimeType = typeof file === 'string'
    ? getMimeTypeByFilename(file)
    : file.type

  return mimeType ? getFileCategoryByMimeType(mimeType) === FileCategory.DOCUMENT : false
}

/**
 * 检查文件是否为音频类型
 */
export function isAudioFile(file: File | string): boolean {
  const mimeType = typeof file === 'string'
    ? getMimeTypeByFilename(file)
    : file.type

  return mimeType ? getFileCategoryByMimeType(mimeType) === FileCategory.AUDIO : false
}

/**
 * 检查文件是否为视频类型
 */
export function isVideoFile(file: File | string): boolean {
  const mimeType = typeof file === 'string'
    ? getMimeTypeByFilename(file)
    : file.type

  return mimeType ? getFileCategoryByMimeType(mimeType) === FileCategory.VIDEO : false
}

/**
 * 检查文件是否为压缩文件类型
 */
export function isArchiveFile(file: File | string): boolean {
  const mimeType = typeof file === 'string'
    ? getMimeTypeByFilename(file)
    : file.type

  return mimeType ? getFileCategoryByMimeType(mimeType) === FileCategory.ARCHIVE : false
}

/**
 * 获取文件类型的图标名称
 */
export function getFileIcon(file: File | string): string {
  const category = typeof file === 'string'
    ? getFileCategoryByFilename(file)
    : getFileCategoryByMimeType(file.type)

  switch (category) {
    case FileCategory.IMAGE:
      return 'picture'
    case FileCategory.DOCUMENT: {
      // 根据具体文件类型返回更精确的图标
      const mimeType = typeof file === 'string'
        ? getMimeTypeByFilename(file)
        : file.type

      if (mimeType === MIME_TYPES.DOCUMENT.PDF)
        return 'pdf'
      if (mimeType === MIME_TYPES.DOCUMENT.DOC || mimeType === MIME_TYPES.DOCUMENT.DOCX)
        return 'doc'
      if (mimeType === MIME_TYPES.DOCUMENT.XLS || mimeType === MIME_TYPES.DOCUMENT.XLSX)
        return 'excel'
      if (mimeType === MIME_TYPES.DOCUMENT.PPT || mimeType === MIME_TYPES.DOCUMENT.PPTX)
        return 'ppt'
      if (mimeType === MIME_TYPES.DOCUMENT.RTF)
        return 'rtf'
      if (mimeType === MIME_TYPES.DOCUMENT.TXT)
        return 'txt'
      return 'doc'
    }
    case FileCategory.AUDIO:
      return 'audio'
    case FileCategory.VIDEO:
      return 'video'
    case FileCategory.ARCHIVE:
      return 'zip'
    default: {
      // 检查是否为特殊类型
      const specificMimeType = typeof file === 'string'
        ? getMimeTypeByFilename(file)
        : file.type

      if (specificMimeType === MIME_TYPES.OTHER.PSD)
        return 'psd'
      return 'unknown'
    }
  }
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0)
    return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
}

/**
 * 验证文件类型是否被允许
 */
export function isFileTypeAllowed(file: File, allowedTypes: string[]): boolean {
  // 支持MIME类型和扩展名两种格式
  const mimeType = file.type
  const extension = getFileExtension(file.name)

  return allowedTypes.some((type) => {
    if (type.includes('/')) {
      // MIME类型匹配
      return mimeType === type || mimeType.startsWith(type.replace('*', ''))
    }
    else {
      // 扩展名匹配
      return extension === type.replace('.', '').toLowerCase()
    }
  })
}

/**
 * 创建文件类型的accept属性字符串
 */
export function createAcceptString(categories: FileCategory[]): string {
  const mimeTypes: string[] = []

  categories.forEach((category) => {
    switch (category) {
      case FileCategory.IMAGE:
        mimeTypes.push(...Object.values(MIME_TYPES.IMAGE))
        break
      case FileCategory.DOCUMENT:
        mimeTypes.push(...Object.values(MIME_TYPES.DOCUMENT))
        break
      case FileCategory.AUDIO:
        mimeTypes.push(...Object.values(MIME_TYPES.AUDIO))
        break
      case FileCategory.VIDEO:
        mimeTypes.push(...Object.values(MIME_TYPES.VIDEO))
        break
      case FileCategory.ARCHIVE:
        mimeTypes.push(...Object.values(MIME_TYPES.ARCHIVE))
        break
    }
  })

  return mimeTypes.join(',')
}
