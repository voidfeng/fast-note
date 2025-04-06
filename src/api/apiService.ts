import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios'

class ApiService {
  private static instance: ApiService | null = null
  private apiUrls: string[] = []
  private fastestUrl: string | null = null
  private checkPromise: Promise<void> | null = null
  private defaultTimeout: number = 30000
  private localStorageKey: string = 'fastestApiUrl'
  private useFastUrl: boolean = true

  private constructor() {
    // 私有构造函数，防止外部直接实例化
  }

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService()
    }
    return ApiService.instance
  }

  public initializeUrls(apiUrls: string[], options?: { useFastUrl?: boolean }) {
    if (!apiUrls || apiUrls.length === 0) {
      throw new Error('At least one API URL must be provided')
    }
    this.apiUrls = apiUrls
    
    if (options?.useFastUrl !== undefined) {
      this.useFastUrl = options.useFastUrl
    }
    
    if (this.useFastUrl) {
      this.fastestUrl = this.getFastestUrlFromStorage()
    } else {
      // 如果禁用了最快URL功能，直接使用第一个URL
      this.fastestUrl = apiUrls[0]
    }
    
    this.checkPromise = null
  }

  private getFastestUrlFromStorage(): string | null {
    try {
      return localStorage.getItem(this.localStorageKey)
    } catch (error) {
      console.error('Error accessing localStorage:', error)
      return null
    }
  }

  private setFastestUrlInStorage(url: string): void {
    try {
      localStorage.setItem(this.localStorageKey, url)
    } catch (error) {
      console.error('Error setting item in localStorage:', error)
    }
  }

  async getFastestUrl(forceCheck: boolean = false): Promise<string | null> {
    if (this.apiUrls.length === 0) {
      throw new Error('API URLs have not been initialized')
    }

    // 如果禁用了最快URL功能，直接返回第一个URL
    if (!this.useFastUrl) {
      return this.apiUrls[0]
    }

    if (this.fastestUrl && !forceCheck) {
      return this.fastestUrl
    }

    if (!this.checkPromise || forceCheck) {
      this.checkPromise = this.checkApiUrls().finally(() => {
        this.checkPromise = null
      })
    }

    try {
      await this.checkPromise
      if (this.fastestUrl) {
        this.setFastestUrlInStorage(this.fastestUrl)
      }
      return this.fastestUrl
    } catch (error) {
      console.error('Failed to get fastest URL:', error)
      return null
    }
  }

  private async checkApiUrls(): Promise<void> {
    try {
      this.fastestUrl = await Promise.race(this.apiUrls.map((url) => this.checkUrl(url)))
      console.log(`Fastest URL: ${this.fastestUrl}`)
    } catch (error) {
      console.error('Error checking API URLs:', error)
      this.fastestUrl = null
      throw error
    }
  }

  private async checkUrl(url: string): Promise<string> {
    try {
      await axios.get(`${location.protocol}//${url}/ping`, {
        timeout: 30000,
      })
      return url
    } catch (error) {
      console.error(`Error checking ${url}:`, error)
      throw error
    }
  }

  async request<T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    if (this.apiUrls.length === 0) {
      throw new Error('API URLs have not been initialized')
    }

    const finalConfig: AxiosRequestConfig = {
      ...config,
      timeout: config.timeout || this.defaultTimeout,
    }

    const getUrl = async (forceCheck: boolean = false): Promise<string> => {
      // 判断是否为相对路径的辅助函数
      const isRelativePath = (url: string): boolean => {
        return !url.includes('://') && !url.startsWith('//')
      }
      
      // 格式化URL，如果不是相对路径，添加协议前缀
      const formatUrl = (url: string): string => {
        if (isRelativePath(url)) {
          return url
        }
        return `${location.protocol}//${url}`
      }
      
      // 如果禁用了最快URL功能，直接使用第一个URL
      if (!this.useFastUrl) {
        return formatUrl(this.apiUrls[0])
      }
      
      const url = await this.getFastestUrl(forceCheck)
      if (!url) {
        throw new Error('No available API URL')
      }
      return formatUrl(url)
    }

    try {
      finalConfig.baseURL = await getUrl()
      return await axios.request<T>(finalConfig)
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (
          ['ERR_NETWORK', 'ECONNABORTED'].includes(error.code as string) ||
          error.message.includes('timeout')
        ) {
          console.log('Request timed out. Rechecking fastest URL...')
          try {
            finalConfig.baseURL = await getUrl(true)
            return await axios.request<T>(finalConfig)
          } catch (retryError) {
            console.error('重新ping或重新请求超时')
            throw error // 仍然返回超时的错误
          }
        }
      }
      throw error
    }
  }

  // 更新 API URLs 的方法
  updateApiUrls(newUrls: string[], options?: { useFastUrl?: boolean }) {
    this.initializeUrls(newUrls, options)
  }
}

// 导出单例实例
export const apiService = ApiService.getInstance()
