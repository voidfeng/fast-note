import { computed, ref } from 'vue'
import { login as apiLogin } from '@/api'

export const cookieKey = 'xanimml'
const cookiesStorageKey = 'xanimml-cookies'

export interface UserInfo {
  username: string
  userid: string
}

const userInfo = ref<UserInfo>({
  username: '',
  userid: '',
})

const storedCookies = ref<string[]>([])

function loadCookiesFromStorage() {
  const savedCookiesJSON = localStorage.getItem(cookiesStorageKey)
  if (savedCookiesJSON) {
    const savedCookies = JSON.parse(savedCookiesJSON) as string[]
    savedCookies.forEach((cookieStr) => {
      document.cookie = cookieStr
    })
  }
}

loadCookiesFromStorage()
refreshUserInfoFromCookie()

function refreshUserInfoFromCookie() {
  const cookieString = document.cookie
  storedCookies.value = cookieString ? cookieString.split('; ') : []
  document.cookie.split('; ').forEach((row) => {
    if (!row)
      return
    const parts = row.split('=')
    const key = parts.shift()?.trim().replace(cookieKey, '') ?? ''
    const value = parts.join('=')
    if (key === 'username' || key === 'userid')
      userInfo.value[key as keyof UserInfo] = value
  })
}

export function useAuth() {
  function userLogout() {
    userInfo.value = {
      username: '',
      userid: '',
    }
    storedCookies.value = []
    localStorage.removeItem(cookiesStorageKey)
    const past = new Date(0).toUTCString()
    document.cookie.split(';').forEach((cookie) => {
      const eqPos = cookie.indexOf('=')
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie
      document.cookie = `${name}=;expires=${past};path=/`
    })
  }

  function setCookiesFromHeaders(newCookies: string[]) {
    localStorage.setItem(cookiesStorageKey, JSON.stringify(newCookies))
    newCookies.forEach((cookieStr) => {
      document.cookie = cookieStr
    })
    refreshUserInfoFromCookie()
  }

  async function login(username: string, password: string) {
    await apiLogin(username, password)
    refreshUserInfoFromCookie()

    // 登录成功后保存cookie到localStorage
    const cookies = document.cookie.split('; ')
    if (cookies.length > 0) {
      setCookiesFromHeaders(cookies)
    }
  }

  const cookieStringForHeader = computed(() => storedCookies.value.join('; '))
  const isLoggedIn = computed(() => !!userInfo.value.username && !!userInfo.value.userid)

  return {
    userInfo,
    userLogout,
    refreshUserInfoFromCookie,
    setCookiesFromHeaders,
    cookieStringForHeader,
    isLoggedIn,
    login,
  }
}
