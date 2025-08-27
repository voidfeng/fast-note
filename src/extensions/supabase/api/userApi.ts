import type { Note } from '@/types'
import { supabase } from './client'

/**
 * 通过用户名获取用户信息
 */
export async function getUserByUsername(username: string): Promise<{ id: string, username: string } | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('username', username)
      .single()

    if (error || !data) {
      console.error('获取用户信息失败:', error)
      return null
    }

    return data
  }
  catch (error) {
    console.error('获取用户信息异常:', error)
    return null
  }
}
