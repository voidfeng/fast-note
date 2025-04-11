import { ref } from 'vue'

export const cookieKey = 'xanimml'

export interface UserInfo {
  username: string
  userid: string
}

const userInfo = ref<UserInfo>({
  username: '',
  userid: '',
})

refreshUserInfoFromCookie()

function refreshUserInfoFromCookie() {
  document.cookie.split('; ').forEach((row) => {
    userInfo.value[row.split('=')[0].replace(cookieKey, '') as keyof UserInfo] = row.split('=')[1]
  })
}

export function useUserInfo() {
  function userLogout() {
    userInfo.value = {
      username: '',
      userid: '',
    }
  }

  return {
    userInfo,
    userLogout,
    refreshUserInfoFromCookie,
  }
}
