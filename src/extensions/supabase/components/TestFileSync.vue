<script setup lang="ts">
import type { TypedFile } from '@/types'
import { onMounted, ref } from 'vue'
import { useDexie } from '@/hooks/useDexie'
import { useSupabaseAuth } from '../hooks/useSupabaseAuth'
import { useSupabaseData } from '../hooks/useSupabaseData'
import { useSupabaseSync } from '../hooks/useSupabaseSync'

const { db } = useDexie()
const { isLoggedIn, userInfo } = useSupabaseAuth()
const { getNoteStats, getFileStats, getFileRefStats } = useSupabaseData()
const { syncStatus, bidirectionalSync, fullSyncToSupabase, getLocalDataStats } = useSupabaseSync()

// 状态
const selectedFiles = ref<File[]>([])
const isCreating = ref(false)
const testResults = ref<Array<{
  action: string
  success: boolean
  message: string
  duration?: number
}>>([])

const localStats = ref({
  notes: 0,
  files: 0,
  fileRefs: 0,
})

const remoteStats = ref({
  notes: 0,
  files: 0,
  fileRefs: 0,
})

// 处理文件选择
function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files) {
    selectedFiles.value = Array.from(target.files)
  }
}

// 创建测试文件
async function createTestFiles() {
  if (!db.value || selectedFiles.value.length === 0)
    return

  isCreating.value = true
  const startTime = Date.now()

  try {
    // 为每个文件创建记录
    const fileRecords: TypedFile[] = []

    for (const file of selectedFiles.value) {
      // 计算文件 hash（简单示例，实际应使用更好的 hash 算法）
      const buffer = await file.arrayBuffer()
      const hashArray = await crypto.subtle.digest('SHA-256', buffer)
      const hashHex = Array.from(new Uint8Array(hashArray))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      fileRecords.push({
        hash: hashHex,
        file,
        lastdotime: new Date().toISOString(),
        isdeleted: 0,
      })
    }

    // 保存到本地数据库
    await db.value.file.bulkAdd(fileRecords)

    // 创建一些测试文件引用
    const fileRefs = fileRecords.map((file, index) => ({
      hash: file.hash,
      refid: `test-note-${index}`,
      lastdotime: new Date().toISOString(),
      isdeleted: 0 as 0 | 1,
    }))

    await db.value.file_refs.bulkAdd(fileRefs)

    const duration = Date.now() - startTime
    testResults.value.push({
      action: '创建测试文件',
      success: true,
      message: `成功创建 ${fileRecords.length} 个文件和 ${fileRefs.length} 个文件引用`,
      duration,
    })

    // 刷新统计
    await refreshStats()
  }
  catch (error) {
    testResults.value.push({
      action: '创建测试文件',
      success: false,
      message: error instanceof Error ? error.message : '创建失败',
    })
  }
  finally {
    isCreating.value = false
  }
}

// 测试双向同步
async function testBidirectionalSync() {
  const startTime = Date.now()

  try {
    const success = await bidirectionalSync()
    const duration = Date.now() - startTime

    testResults.value.push({
      action: '双向同步',
      success,
      message: success ? '同步成功' : '同步失败',
      duration,
    })

    // 刷新统计
    await refreshStats()
  }
  catch (error) {
    testResults.value.push({
      action: '双向同步',
      success: false,
      message: error instanceof Error ? error.message : '同步异常',
    })
  }
}

// 测试全量上传
async function testFullSync() {
  const startTime = Date.now()

  try {
    const success = await fullSyncToSupabase()
    const duration = Date.now() - startTime

    testResults.value.push({
      action: '全量上传',
      success,
      message: success ? '上传成功' : '上传失败',
      duration,
    })

    // 刷新统计
    await refreshStats()
  }
  catch (error) {
    testResults.value.push({
      action: '全量上传',
      success: false,
      message: error instanceof Error ? error.message : '上传异常',
    })
  }
}

// 刷新统计数据
async function refreshStats() {
  // 本地统计
  localStats.value = await getLocalDataStats()

  // 云端统计
  const [notes, files, fileRefs] = await Promise.all([
    getNoteStats(),
    getFileStats(),
    getFileRefStats(),
  ])

  remoteStats.value = {
    notes,
    files,
    fileRefs,
  }
}

// 组件挂载时刷新统计
onMounted(() => {
  refreshStats()
})
</script>

<template>
  <div class="test-file-sync p-4">
    <h2 class="text-xl font-bold mb-4">
      文件同步测试
    </h2>

    <!-- 登录状态 -->
    <div class="mb-4 p-3 bg-gray-100 rounded">
      <p>登录状态: {{ isLoggedIn ? '已登录' : '未登录' }}</p>
      <p v-if="userInfo">
        用户: {{ userInfo.email }}
      </p>
    </div>

    <!-- 文件上传测试 -->
    <div class="mb-6">
      <h3 class="text-lg font-semibold mb-2">
        1. 创建测试文件
      </h3>
      <input
        type="file"
        multiple
        class="mb-2"
        @change="handleFileSelect"
      >
      <button
        :disabled="!selectedFiles.length || isCreating"
        class="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
        @click="createTestFiles"
      >
        {{ isCreating ? '创建中...' : `创建 ${selectedFiles.length} 个测试文件` }}
      </button>
    </div>

    <!-- 同步测试 -->
    <div class="mb-6">
      <h3 class="text-lg font-semibold mb-2">
        2. 执行同步测试
      </h3>
      <button
        :disabled="!isLoggedIn || syncStatus.isSync"
        class="px-4 py-2 bg-green-500 text-white rounded disabled:bg-gray-300 mr-2"
        @click="testBidirectionalSync"
      >
        测试双向同步
      </button>
      <button
        :disabled="!isLoggedIn || syncStatus.isSync"
        class="px-4 py-2 bg-purple-500 text-white rounded disabled:bg-gray-300"
        @click="testFullSync"
      >
        测试全量上传
      </button>
    </div>

    <!-- 同步状态 -->
    <div v-if="syncStatus.isSync" class="mb-6 p-4 bg-blue-50 rounded">
      <h3 class="text-lg font-semibold mb-2">
        同步状态
      </h3>
      <p>{{ syncStatus.currentStep }}</p>
      <div class="w-full bg-gray-200 rounded-full h-2.5 mt-2">
        <div
          class="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
          :style="{ width: `${syncStatus.progress}%` }"
        />
      </div>
      <p class="text-sm text-gray-600 mt-1">
        {{ syncStatus.progress }}%
      </p>
    </div>

    <!-- 测试结果 -->
    <div v-if="testResults.length" class="mb-6">
      <h3 class="text-lg font-semibold mb-2">
        测试结果
      </h3>
      <div class="space-y-2">
        <div
          v-for="(result, index) in testResults"
          :key="index"
          class="p-3 rounded"
          :class="{
            'bg-green-100': result.success,
            'bg-red-100': !result.success,
          }"
        >
          <p class="font-medium">
            {{ result.action }}
          </p>
          <p class="text-sm">
            {{ result.message }}
          </p>
          <p v-if="result.duration" class="text-xs text-gray-600">
            耗时: {{ result.duration }}ms
          </p>
        </div>
      </div>
    </div>

    <!-- 数据统计 -->
    <div class="mb-6">
      <h3 class="text-lg font-semibold mb-2">
        数据统计
      </h3>
      <button
        class="px-3 py-1 bg-gray-500 text-white rounded text-sm mb-2"
        @click="refreshStats"
      >
        刷新统计
      </button>
      <div class="grid grid-cols-2 gap-4">
        <div class="p-3 bg-gray-50 rounded">
          <p class="font-medium">
            本地数据
          </p>
          <p>笔记: {{ localStats.notes }}</p>
          <p>文件: {{ localStats.files }}</p>
          <p>文件引用: {{ localStats.fileRefs }}</p>
        </div>
        <div class="p-3 bg-gray-50 rounded">
          <p class="font-medium">
            云端数据
          </p>
          <p>笔记: {{ remoteStats.notes }}</p>
          <p>文件: {{ remoteStats.files }}</p>
          <p>文件引用: {{ remoteStats.fileRefs }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.test-file-sync {
  max-width: 800px;
  margin: 0 auto;
}
</style>
