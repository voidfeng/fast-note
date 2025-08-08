import type { FetchRequestConfig, FetchResponse } from './apiService'
import type { FileRef, Note, TypedFile } from '@/types'
import { alertController } from '@ionic/vue'
import { isTauri } from '@tauri-apps/api/core'
import { useUserInfo } from '@/hooks/useUserInfo'
import { apiService } from './apiService'

export interface ApiResponse<T> {
  headers?: string[]
  s: number
  m: Array<{ msg: string }>
  d: T
}

// 初始化 API URLs
apiService.initializeUrls(JSON.parse(import.meta.env.VITE_API_URLS), { useFastUrl: false })

export function request<T = any>(config: FetchRequestConfig): Promise<ApiResponse<T>> {
  const { cookieStringForHeader, setCookiesFromHeaders } = useUserInfo()
  if (cookieStringForHeader.value) {
    config.headers = {
      ...config.headers,
      Cookie: cookieStringForHeader.value,
    }
  }
  return new Promise((resolve, reject) => {
    apiService
      .request<ApiResponse<T>>(config)
      .then((d: FetchResponse<ApiResponse<T>>) => {
        if (typeof d.data === 'object' && d.data.s !== 0) {
          let message
          if (typeof d.data.m === 'string') {
            message = d.data.m
          }
          else {
            message = d.data.m.map(item => item.msg).join(',')
          }
          throw new Error(message)
        }
        else if (typeof d.data === 'string') {
          const error = checkHtmlLoginError(d.data)
          if (error) {
            const { userLogout } = useUserInfo()
            userLogout()
            throw new Error(error)
          }
        }
        if (config.data?.toString().includes('enews=login') && isTauri()) {
          const cookies = d.headers.getSetCookie()
          if (cookies && cookies.length > 0)
            setCookiesFromHeaders(cookies)
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

// 检测HTML响应中的错误信息
function checkHtmlLoginError(html: string): string | null {
  enum LoginError {
    isLogout = '您还没登录!',
    isLoginOtherPlace = '同一帐号同一时刻只能一人在线!',
  }
  if (html.includes(LoginError.isLogout)) {
    return LoginError.isLogout
  }
  else if (html.includes(LoginError.isLoginOtherPlace)) {
    return LoginError.isLoginOtherPlace
  }
  return null
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
        if (text && text.includes('登录成功')) {
          const { refreshUserInfoFromCookie } = useUserInfo()
          refreshUserInfoFromCookie()
          res({ s: 1, m: '登录成功' })
        }
        else {
          rej(new Error(text || '登录失败'))
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
export function getCloudNodesByLastdotime(lastdotime: string) {
  return request({ url: `/e/eapi/DtUserpage.php?aid=1&lastdotime=${lastdotime}` })
}

// 添加备忘录
export function addCloudNote(note: Note) {
  return new Promise((res, rej) => {
    const formData = new FormData()
    formData.append('enews', 'MAddInfo')
    formData.append('classid', '2')
    formData.append('mid', '9')
    formData.append('id', '0')
    formData.append('addnews', '提交')

    Object.entries(note).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString())
      }
    })
    request({
      url: `/e/DoInfo/ecms.php`,
      method: 'post',
      data: formData,
    }).then((d) => {
      // 从响应中提取 ID
      const response = d as unknown as string
      const match = response.match(/AddInfo\.php\?classid=\d+&mid=\d+&id=(\d+)/)
      if (match && match[1]) {
        res(match[1])
      }
      else {
        rej(new Error('添加备忘录失败'))
      }
    }).catch((e) => {
      rej(e)
    })
  })
}

// 更新备忘录
export function updateCloudNote(note: Note) {
  const formData = new FormData()
  formData.append('enews', 'MEditInfo')
  formData.append('classid', '2')
  formData.append('mid', '9')
  Object.entries(note).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value.toString())
    }
  })
  return request({
    url: `/e/DoInfo/ecms.php`,
    method: 'post',
    data: formData,
  })
}

// 获取云端引用表
export function getCloudFileRefsByLastdotime(lastdotime: string) {
  return request({ url: `/e/eapi/DtUserpage.php?aid=2&lastdotime=${lastdotime}` })
}

// 添加云端引用
export function addCloudFileRef(fileRef: FileRef) {
  return new Promise((res, rej) => {
    const formData = new FormData()
    formData.append('title', fileRef.hash)
    formData.append('titlepic', fileRef.refid)
    formData.append('isdeleted', '0')
    formData.append('enews', 'MAddInfo')
    formData.append('classid', '4')
    formData.append('mid', '11')
    formData.append('id', '0')
    formData.append('addnews', '提交')
    request({
      url: `/e/DoInfo/ecms.php`,
      method: 'post',
      data: formData,
    }).then((d) => {
      // 从响应中提取 ID
      const response = d as unknown as string
      const match = response.match(/AddInfo\.php\?classid=\d+&mid=\d+&id=(\d+)/)
      if (match && match[1]) {
        res(Number.parseInt(match[1]))
      }
      else {
        rej(new Error('添加附件引用失败'))
      }
    }).catch((e) => {
      rej(e)
    })
  })
}

// 更新云端引用
export function updateCloudFileRef(fileRef: FileRef) {
  return new Promise((res, rej) => {
    const formData = new FormData()
    formData.append('enews', 'MEditInfo')
    formData.append('classid', '4')
    formData.append('mid', '11')
    Object.entries(fileRef).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString())
      }
    })
    request({
      url: `/e/DoInfo/ecms.php`,
      method: 'post',
      data: formData,
    }).then((d) => {
      res(d)
    }).catch((e) => {
      rej(e)
    })
  })
}

// 删除云端引用
export function deleteCloudFile(id: number) {
  return new Promise((res, rej) => {
    request({ url: `/e/DoInfo/ecms.php?enews=MDelInfo&classid=4&mid=11&id=${id}`, method: 'get' })
      .then((d) => {
        res(d)
      })
      .catch((e) => {
        rej(e)
      })
  })
}

// 获取附件列表
export function getCloudFilesByLastdotime(lastdotime: string) {
  return request({ url: `/e/eapi/DtUserpage.php?aid=3&lastdotime=${lastdotime}` })
}

// 添加附件
export function addCloudFile(file: TypedFile): Promise<number> {
  return new Promise((res, rej) => {
    const formData = new FormData()
    formData.append('enews', 'MAddInfo')
    formData.append('classid', '3')
    formData.append('mid', '10')
    formData.append('id', '0')
    formData.append('addnews', '提交')
    formData.append('urlfile', new Blob([file.file!], { type: file.file!.type }), file.file!.name)
    formData.append('filetype', file.file!.type)
    formData.append('hash', file.hash || '')
    formData.append('title', file.file!.name)
    request({ url: `/e/DoInfo/ecms.php`, method: 'post', data: formData })
      .then((d) => {
        // 从响应中提取 ID
        const response = d as unknown as string
        const match = response.match(/AddInfo\.php\?classid=\d+&mid=\d+&id=(\d+)/)
        if (match && match[1]) {
          res(Number.parseInt(match[1]))
        }
        else {
          rej(new Error('添加附件失败'))
        }
      })
      .catch((e) => {
        rej(e)
      })
  })
}

// 获取附件
export function getCloudFile(id: number) {
  return request({ url: `/e/eapi/DtUserpage.php?aid=4&id=${id}`, method: 'get' })
}
