/**
 * useRefDBSync 使用示例
 */

import type { Note } from '@/types'
import { ref } from 'vue'
import { useDexie } from './useDexie'
import { useRefDBSync } from './useRefDBSync'

// 示例 1: 基本使用 - 笔记数据同步
export function useNoteSync() {
  const { db } = useDexie()

  // 外部创建响应式数据
  const notes = ref<Note[]>([])

  const {
    syncStatus,
    manualSync,
    getCurrentTime,
  } = useRefDBSync<Note>({
    data: notes, // 传入外部创建的响应式数据
    table: db.value.note, // 直接传入表实例
    idField: 'uuid',
    debounceMs: 500, // 500ms 防抖
  })

  // 添加新笔记
  function createNote(title: string, content: string) {
    const newNote: Note = {
      uuid: crypto.randomUUID(),
      title,
      newstext: content,
      newstime: getCurrentTime(),
      type: 'note',
      puuid: null,
      version: 1,
      isdeleted: 0,
      islocked: 0,
      subcount: 0,
      lastdotime: getCurrentTime(),
    }
    notes.value.push(newNote)
    return newNote
  }

  // 更新笔记
  function editNote(uuid: string, updates: Partial<Note>) {
    const index = notes.value.findIndex(note => note.uuid === uuid)
    if (index !== -1) {
      notes.value[index] = {
        ...notes.value[index],
        ...updates,
        lastdotime: getCurrentTime(),
      }
      return notes.value[index]
    }
    return null
  }

  // 删除笔记
  function deleteNote(uuid: string) {
    const index = notes.value.findIndex(note => note.uuid === uuid)
    if (index !== -1) {
      return notes.value.splice(index, 1)[0]
    }
    return null
  }

  return {
    notes,
    syncStatus,
    createNote,
    editNote,
    deleteNote,
    manualSync,
  }
}

// 示例 2: 自定义数据类型
interface TodoItem {
  id: string
  title: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  lastdotime: string
}

export function useTodoSync() {
  const { db } = useDexie()

  // 外部创建响应式数据
  const todos = ref<TodoItem[]>([])

  // 假设在 useDexie 中已经定义了 todos 表
  const {
    syncStatus,
    getCurrentTime,
  } = useRefDBSync<TodoItem>({
    data: todos, // 传入外部创建的响应式数据
    table: db.value.todos, // 直接传入表实例
    idField: 'id',
  })

  function addTodo(title: string, priority: TodoItem['priority'] = 'medium') {
    const newTodo: TodoItem = {
      id: crypto.randomUUID(),
      title,
      completed: false,
      priority,
      lastdotime: getCurrentTime(),
    }
    todos.value.push(newTodo)
    return newTodo
  }

  function toggleTodo(id: string) {
    const index = todos.value.findIndex(t => t.id === id)
    if (index !== -1) {
      todos.value[index] = {
        ...todos.value[index],
        completed: !todos.value[index].completed,
        lastdotime: getCurrentTime(),
      }
      return todos.value[index]
    }
    return null
  }

  function deleteTodo(id: string) {
    const index = todos.value.findIndex(t => t.id === id)
    if (index !== -1) {
      return todos.value.splice(index, 1)[0]
    }
    return null
  }

  return {
    todos,
    syncStatus,
    addTodo,
    toggleTodo,
    deleteTodo,
  }
}

// 示例 3: 在 Vue 组件中使用
/*
<template>
  <div>
    <div v-if="syncStatus.isLoading">同步中...</div>
    <div v-if="syncStatus.error" class="error">{{ syncStatus.error }}</div>

    <button @click="createNote('新笔记', '笔记内容')">添加笔记</button>
    <button @click="manualSync">手动同步</button>

    <div v-for="note in notes" :key="note.uuid">
      <h3>{{ note.title }}</h3>
      <p>{{ note.newstext }}</p>
      <button @click="editNote(note.uuid, { title: '修改后的标题' })">编辑</button>
      <button @click="deleteNote(note.uuid)">删除</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNoteSync } from '@/hooks/useRefDBSync.example'

const {
  notes,
  syncStatus,
  createNote,
  editNote,
  deleteNote,
  manualSync
} = useNoteSync()
</script>
*/
