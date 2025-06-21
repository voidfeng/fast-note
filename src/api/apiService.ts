import { fetch as tauriFetch } from '@tauri-apps/plugin-http'

// 新增的接口，用于替代 AxiosRequestConfig
export interface FetchRequestConfig extends RequestInit {
  url?: string
  timeout?: number
  data?: any
}

// 新增的接口，用于替代 AxiosResponse
export interface FetchResponse<T> {
  data: T
  status: number
  statusText: string
  headers: Headers
  ok: boolean
}

const targetFetch = location.protocol === 'tauri:' ? tauriFetch : fetch

class ApiService {
  private static instance: ApiService | null = null
  private apiUrls: string[] = []
  private fastestUrl: string | null = null
  private checkPromise: Promise<void> | null = null
  private defaultTimeout: number = 30000
  private localStorageKey: string = 'fastestApiUrl'
  private useFastUrl: boolean = true

  private get protocol(): string {
    if (location.protocol === 'http:' || location.protocol === 'https:')
      return location.protocol

    return 'https:'
  }

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
    }
    else {
      // 如果禁用了最快URL功能，直接使用第一个URL
      this.fastestUrl = apiUrls[0]
    }

    this.checkPromise = null
  }

  private getFastestUrlFromStorage(): string | null {
    try {
      return localStorage.getItem(this.localStorageKey)
    }
    catch (error) {
      console.error('Error accessing localStorage:', error)
      return null
    }
  }

  private setFastestUrlInStorage(url: string): void {
    try {
      localStorage.setItem(this.localStorageKey, url)
    }
    catch (error) {
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
    }
    catch (error) {
      console.error('Failed to get fastest URL:', error)
      return null
    }
  }

  private async checkApiUrls(): Promise<void> {
    try {
      this.fastestUrl = await Promise.race(this.apiUrls.map(url => this.checkUrl(url)))
    }
    catch (error) {
      console.error('Error checking API URLs:', error)
      this.fastestUrl = null
      throw error
    }
  }

  private async checkUrl(url: string): Promise<string> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    try {
      const pingUrl = url === '/' ? '/ping' : `${this.protocol}//${url}/ping`
      const response = await targetFetch(pingUrl, {
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`)

      return url
    }
    catch (error) {
      clearTimeout(timeoutId)
      console.error(`Error checking ${url}:`, error)
      throw error
    }
  }

  async request<T>(config: FetchRequestConfig): Promise<FetchResponse<T>> {
    if (this.apiUrls.length === 0)
      throw new Error('API URLs have not been initialized')

    const getUrl = async (forceCheck: boolean = false): Promise<string> => {
      // 判断是否为相对路径的辅助函数
      const isNotAbsolute = (url: string): boolean => {
        return !url.includes('://') && !url.startsWith('//')
      }

      // 格式化URL，如果不是绝对路径，添加协议前缀
      const formatUrl = (url: string): string => {
        if (url === '/')
          return '' // Use relative path from root

        if (isNotAbsolute(url))
          return `${this.protocol}//${url}`

        return url
      }

      // 如果禁用了最快URL功能，直接使用第一个URL
      if (!this.useFastUrl)
        return formatUrl(this.apiUrls[0])

      const url = await this.getFastestUrl(forceCheck)
      if (!url)
        throw new Error('No available API URL')

      return formatUrl(url)
    }

    const performFetch = async (forceCheck: boolean = false): Promise<FetchResponse<T>> => {
      const baseUrl = await getUrl(forceCheck)
      const requestUrl = config.url || ''

      // 确保 baseUrl 以 / 结尾，requestUrl 不以 / 开头，然后拼接它们
      const fullUrl = `${baseUrl.replace(/\/$/, '')}/${requestUrl.replace(/^\//, '')}`

      const controller = new AbortController()
      const timeout = config.timeout || this.defaultTimeout
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const fetchOptions: RequestInit = { ...config, signal: controller.signal }

      // axios的 'data' 对应 fetch 的 'body'
      if (config.data) {
        // For FormData, the browser automatically sets the Content-Type with the correct boundary.
        // We should not handle it manually.
        if (config.data instanceof FormData) {
          fetchOptions.body = config.data
        }
        else {
          const headers = new Headers(fetchOptions.headers)
          if (!headers.has('Content-Type'))
            headers.set('Content-Type', 'application/x-www-form-urlencoded')

          fetchOptions.headers = headers
          const contentType = headers.get('Content-Type') || ''

          if (contentType.includes('application/json')) {
            fetchOptions.body = JSON.stringify(config.data)
          }
          else if (contentType.includes('application/x-www-form-urlencoded')) {
            fetchOptions.body = new URLSearchParams(
              config.data as Record<string, string>,
            ).toString()
          }
          else {
            fetchOptions.body = config.data
          }
        }
      }

      // 清理自定义属性，避免 fetch 报错
      delete (fetchOptions as any).url
      delete (fetchOptions as any).data
      delete (fetchOptions as any).timeout

      try {
        const response = await targetFetch(fullUrl, fetchOptions)
        clearTimeout(timeoutId)

        if (!response.ok)
          throw new Error(`HTTP Error: ${response.status} ${response.statusText}`)

        let responseData: T
        const responseText = await response.text()
        try {
          responseData = JSON.parse(responseText)
        }
        catch {
          // If JSON parsing fails, return the raw text.
          responseData = responseText as any
        }

        return {
          data: responseData,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          ok: response.ok,
        }
      }
      catch (error) {
        clearTimeout(timeoutId)
        throw error
      }
    }

    try {
      return await performFetch()
    }
    catch (error: any) {
      if (error.name === 'AbortError' || (error instanceof TypeError && error.message === 'Failed to fetch')) {
        console.warn('Request timed out or network error. Rechecking fastest URL...')
        try {
          return await performFetch(true)
        }
        catch (retryError: any) {
          console.error('Retry request failed:', retryError.message)
          throw error // 仍然返回原始错误
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
