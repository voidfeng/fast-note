import type { FileRef, Note, TypedFile } from '@/types'
import { request } from '@/api'

// 获取云端备忘录列表
export function getCloudNodesByLastdotime(lastdotime: number) {
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
export function getCloudFileRefsByLastdotime(lastdotime: number) {
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
export function getCloudFilesByLastdotime(lastdotime: number) {
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
