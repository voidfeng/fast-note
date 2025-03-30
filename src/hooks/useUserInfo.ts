import { ref } from "vue"

export const cookieKey = 'xanimml'

export interface UserInfo {
  username: string
  userid: string
}

export function useUserInfo() {
  const userInfo = ref<UserInfo>({
    username: '',
    userid: '',
  })

  document.cookie.split('; ').forEach((row) => {
    userInfo.value[row.split('=')[0].replace(cookieKey, '') as keyof UserInfo] = row.split('=')[1]
  })

  return {
    userInfo,
  }
}