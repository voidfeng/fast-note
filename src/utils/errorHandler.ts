/**
 * 统一错误处理工具
 */

export enum ErrorType {
  NETWORK = 'NETWORK',
  DATABASE = 'DATABASE',
  VALIDATION = 'VALIDATION',
  PERMISSION = 'PERMISSION',
  FILE_OPERATION = 'FILE_OPERATION',
  SYNC = 'SYNC',
  UNKNOWN = 'UNKNOWN',
}

export interface AppError {
  type: ErrorType
  message: string
  code?: string
  details?: any
  timestamp: number
}

class ErrorHandler {
  private errorLog: AppError[] = []

  /**
   * 记录错误
   */
  logError(error: AppError): void {
    this.errorLog.push(error)
    console.error('[错误记录]', error)

    // 在开发环境下显示详细错误信息
    if (import.meta.env.DEV) {
      console.trace('错误堆栈:', error)
    }
  }

  /**
   * 创建错误对象
   */
  createError(
    type: ErrorType,
    message: string,
    code?: string,
    details?: any,
  ): AppError {
    return {
      type,
      message,
      code,
      details,
      timestamp: Date.now(),
    }
  }

  /**
   * 处理数据库错误
   */
  handleDatabaseError(error: any): AppError {
    const appError = this.createError(
      ErrorType.DATABASE,
      '数据库操作失败',
      error.code,
      error,
    )
    this.logError(appError)
    return appError
  }

  /**
   * 处理网络错误
   */
  handleNetworkError(error: any): AppError {
    const appError = this.createError(
      ErrorType.NETWORK,
      '网络请求失败',
      error.code,
      error,
    )
    this.logError(appError)
    return appError
  }

  /**
   * 处理文件操作错误
   */
  handleFileError(error: any): AppError {
    const appError = this.createError(
      ErrorType.FILE_OPERATION,
      '文件操作失败',
      error.code,
      error,
    )
    this.logError(appError)
    return appError
  }

  /**
   * 处理验证错误
   */
  handleValidationError(message: string, details?: any): AppError {
    const appError = this.createError(
      ErrorType.VALIDATION,
      message,
      'VALIDATION_ERROR',
      details,
    )
    this.logError(appError)
    return appError
  }

  /**
   * 获取错误日志
   */
  getErrorLog(): AppError[] {
    return [...this.errorLog]
  }

  /**
   * 清空错误日志
   */
  clearErrorLog(): void {
    this.errorLog = []
  }

  /**
   * 获取用户友好的错误消息
   */
  getUserFriendlyMessage(error: AppError): string {
    const messageMap: Record<ErrorType, string> = {
      [ErrorType.NETWORK]: '网络连接异常，请检查网络设置',
      [ErrorType.DATABASE]: '数据保存失败，请稍后重试',
      [ErrorType.VALIDATION]: '输入信息有误，请检查后重试',
      [ErrorType.PERMISSION]: '权限不足，无法执行此操作',
      [ErrorType.FILE_OPERATION]: '文件处理失败，请稍后重试',
      [ErrorType.SYNC]: '同步失败，请检查网络连接',
      [ErrorType.UNKNOWN]: '操作失败，请稍后重试',
    }

    return messageMap[error.type] || error.message
  }
}

// 导出单例实例
export const errorHandler = new ErrorHandler()

/**
 * 异步操作包装器，自动处理错误
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorType: ErrorType = ErrorType.UNKNOWN,
): Promise<{ data?: T, error?: AppError }> {
  try {
    const data = await operation()
    return { data }
  }
  catch (err: any) {
    const error = errorHandler.createError(
      errorType,
      err.message || '操作失败',
      err.code,
      err,
    )
    errorHandler.logError(error)
    return { error }
  }
}
