import type {
  /*AxiosProgressEvent,*/ AxiosRequestConfig,
  AxiosResponse /*CancelToken*/,
} from 'axios'
import { apiService } from './apiService'
import { alertController } from '@ionic/vue'
import { Note } from '@/hooks/useDexie'

export interface ApiResponse<T> {
  s: number
  m: Array<{ msg: string }>
  d: T
}

// 初始化 API URLs
apiService.initializeUrls(JSON.parse(import.meta.env.VITE_API_URLS))

export function request<T = any>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
  return new Promise((resolve, reject) => {
    apiService
      .request<ApiResponse<T>>(config)
      .then((d: AxiosResponse<ApiResponse<T>>) => {
        if (typeof d.data === 'object' && d.data.s !== 1) {
          let message
          if (typeof d.data.m === 'string') {
            message = d.data.m
          } else {
            message = d.data.m.map((item) => item.msg).join(',')
          }
          throw new Error(message)
        }
        resolve(d.data)
      })
      .catch((e: any) => {
        if (e.message !== 'canceled') {
          alertController
            .create({
              header: e.message,
              buttons: ['确定'],
            })
            .then((alert) => {
              alert.present()
            })
        }
        reject(new Error(`未知错误：${e.message}`))
      })
  })
}

export function login(username: string, password: string) {
  return new Promise((res, rej) => {
    request({
      url: '/e/member/doaction.php',
      method: 'post',
      data: `enews=login&ecmsfrom=9&username=${username}&password=${password}&Submit=%E7%99%BB%E9%99%86`,
    })
      .then((d) => {
        let text: RegExpMatchArray | string | null = (d as unknown as string).match(/<b>(.*?)<\/b>/)
        if (text) {
          text = text[1].trim()
        }
        if (text && text.indexOf('登录成功') > -1) {
          res({ s: 1, m: '登录成功' })
        } else {
          rej({ s: 0, m: text })
          alertController
            .create({
              header: text || '登录失败',
              buttons: ['确定'],
            })
            .then((alert) => {
              alert.present()
            })
        }
      })
      .catch((e) => {
        rej(e)
      })
  })
}

// 获取云端备忘录列表
export function getCloudNodesByLastdotime(lastdotime: number) {
  return request({ url: `/e/eapi/DtUserpage.php?aid=1&lastdotime=${lastdotime}` })
}

// 添加备忘录
export function addCloudNote(note: Note) {
  const formData = new FormData()
  formData.append('enews', 'MAddInfo')
  formData.append('classid', '2')
  formData.append('mid', '9')
  formData.append('id', '0')
  formData.append('addnews', '提交')

  Object.entries(note).forEach(([key, value]) => {
    if (value !== undefined) {
      formData.append(key, value.toString())
    }
  })
  return request({
    url: `/e/DoInfo/ecms.php`,
    method: 'post',
    data: formData
  })
}

// 更新备忘录
export function updateCloudNote(note: Note) {
  const formData = new FormData()
  formData.append('enews', 'MEditInfo')
  formData.append('classid', '2')
  formData.append('mid', '9')
  Object.entries(note).forEach(([key, value]) => {
    if (value !== undefined) {
      formData.append(key, value.toString())
    }
  })
  return request({ 
    url: `/e/DoInfo/ecms.php`,
    method: 'post',
    data: note 
  })
}