import type { /*AxiosProgressEvent,*/ AxiosRequestConfig, AxiosResponse, /*CancelToken*/ } from 'axios'
import { apiService } from './apiService'
import { alertController } from '@ionic/vue'

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
          alertController.create({
            header: e.message,
            buttons: ['确定'],
          });
        }
        reject(new Error(`未知错误：${e.message}`))
      })
  })
}

export function fileUpload(data: any) {
  return request({
    url: '/api/app/fileUpload',
    method: 'post',
    data,
  })
}
