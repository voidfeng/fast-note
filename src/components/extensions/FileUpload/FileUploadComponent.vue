<script setup lang="ts">
import { NodeViewWrapper } from '@tiptap/vue-3'
import { computed, onMounted, ref, watch } from 'vue'
import { useFiles } from '@/hooks/useFiles'

interface Extension {
  name: string
  options: {
    loadFile?: (url: string) => Promise<{ url: string, type: string }>
    onImageLoaded?: (url: string, width: number, height: number) => void
  }
}

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
  selected: {
    type: Boolean,
    default: false,
  },
  getPos: {
    type: Function,
    required: true,
  },
  editor: {
    type: Object,
    required: true,
  },
})

const nodeProps = computed(() => ({
  url: props.node.attrs.url,
}))

// 获取 fileUpload 扩展实例
const fileUploadExtension = computed<Extension | undefined>(() => {
  // 使用 as 类型断言
  return (props.editor?.extensionManager?.extensions as Extension[] | undefined)?.find(
    ext => ext.name === 'fileUpload',
  )
})

// 检查URL是否为SHA256哈希值格式
const isSha256Hash = computed(() => {
  const url = nodeProps.value.url
  if (!url)
    return false
  // SHA256哈希通常是64个16进制字符
  return /^[a-f0-9]{64}$/i.test(url)
})

const imageRef = ref<HTMLImageElement | null>(null)
const containerSize = ref({ width: '88px', height: '88px' })
const imageUrl = ref('')
const isLoading = ref(true)
const hasError = ref(false)
const fileTypeName = ref('') // 存储从loadFile返回的文件类型

const isImage = computed(() => {
  const url = nodeProps.value.url
  if (!url)
    return false
  return fileTypeName.value.match(/(jpg|jpeg|png|gif|webp)$/i)
})

const fileType = computed(() => {
  // 如果有从服务器返回的文件类型，优先使用
  if (fileTypeName.value) {
  // MIME类型映射
    const mimeTypeMap: Record<string, string> = {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'excel', // xlsx
      'application/vnd.ms-excel': 'excel', // xls
      'application/illustrator': 'ai',
      'audio/mpeg': 'audio', // mp3
      'audio/wav': 'audio',
      'application/msword': 'doc', // doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'doc', // docx
      'application/pdf': 'pdf',
      'application/vnd.ms-powerpoint': 'ppt', // ppt
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'ppt', // pptx
      'image/vnd.adobe.photoshop': 'psd',
      'application/rtf': 'rtf',
      'text/plain': 'txt',
      'video/mp4': 'video',
      'video/x-msvideo': 'video', // avi
      'video/quicktime': 'video', // mov
      'application/zip': 'zip',
      'application/x-rar-compressed': 'zip', // rar
      'application/x-7z-compressed': 'zip', // 7z
      'image/jpeg': 'picture',
      'image/png': 'picture',
      'image/gif': 'picture',
      'image/webp': 'picture',
    }
    return mimeTypeMap[fileTypeName.value] || 'unknown'
  }

  if (isImage.value)
    return 'picture'

  const url = nodeProps.value.url
  if (!url)
    return 'unknown'
  const extension = url.split('.').pop()?.toLowerCase()

  const typeMap: Record<string, string> = {
    'xlsx': 'excel',
    'xls': 'excel',
    'ai': 'ai',
    'mp3': 'audio',
    'wav': 'audio',
    'doc': 'doc',
    'docx': 'doc',
    'pdf': 'pdf',
    'ppt': 'ppt',
    'pptx': 'ppt',
    'psd': 'psd',
    'rtf': 'rtf',
    'txt': 'txt',
    'mp4': 'video',
    'avi': 'video',
    'mov': 'video',
    'zip': 'zip',
    'rar': 'zip',
    '7z': 'zip',
  }

  return typeMap[extension || ''] || 'unknown'
})

// 从fileType派生是否是图片
const isPictureType = computed(() => {
  return fileType.value === 'picture'
})

const fileTypeIcon = computed(() => {
  return `/file/${fileType.value}.svg`
})

// 图片尺寸常量
const DEFAULT_SIZE = 88
const MAX_SIZE = 208

/**
 * 图片加载完成后计算尺寸：等比例缩放图片尺寸
 * 1. 高度等比例缩放到DEFAULT_SIZE，检查宽度
 * 2. 宽度等比例缩放到DEFAULT_SIZE，检查高度
 * 3. 否则，宽度设置为DEFAULT_SIZE，高度等比例缩放
 * @param event 事件对象
 */
function onImageLoad(event: Event) {
  const img = event.target as HTMLImageElement
  const naturalWidth = img.naturalWidth
  const naturalHeight = img.naturalHeight
  const aspectRatio = naturalWidth / naturalHeight

  // 1. 高度等比例缩放到DEFAULT_SIZE，检查宽度
  let height = DEFAULT_SIZE
  let width = height * aspectRatio
  if (width > MAX_SIZE) {
    // 如果宽度大于MAX_SIZE，则宽度等比例缩放到MAX_SIZE
    width = MAX_SIZE
    height = width / aspectRatio
  }
  else {
    // 2. 宽度等比例缩放到DEFAULT_SIZE，检查高度
    width = DEFAULT_SIZE
    height = width / aspectRatio
    if (height > MAX_SIZE) {
      // 如果高度大于MAX_SIZE，则高度等比例缩放到MAX_SIZE
      height = MAX_SIZE
      width = height * aspectRatio
    }
    else {
      // 3. 否则，宽度设置为DEFAULT_SIZE，高度等比例缩放
      width = DEFAULT_SIZE
      height = width / aspectRatio
    }
  }

  containerSize.value = {
    width: `${width}px`,
    height: `${height}px`,
  }

  // 通知YYEditor中配置的onImageLoaded方法图片已加载完成
  try {
    const onImageLoaded = fileUploadExtension.value?.options?.onImageLoaded
    if (onImageLoaded && imageUrl.value) {
      onImageLoaded(imageUrl.value, naturalWidth, naturalHeight)
    }
  }
  catch (error) {
    console.warn('调用onImageLoaded方法失败:', error)
  }
}

// 图片加载失败
function onImageError() {
  hasError.value = true
}

// 使用扩展的 loadFile 方法加载文件
async function loadFileWithExtension(url: string) {
  // 设置加载状态
  isLoading.value = true
  hasError.value = false
  imageUrl.value = url // 默认使用原始URL

  const { getFileByHash } = useFiles()

  // 优先从 indexedDB 获取文件
  try {
    const fileData = await getFileByHash(url)
    if (fileData && fileData.file instanceof File) {
      // 如果获取到 File 对象，直接创建 blob URL
      const blobUrl = URL.createObjectURL(fileData.file)
      imageUrl.value = blobUrl
      fileTypeName.value = fileData.file.type || '' // 使用 File 的 MIME 类型
      isLoading.value = false
      return
    }
  }
  catch (indexedDBError) {
    console.warn('从 indexedDB 获取文件失败:', indexedDBError)
  }

  // 如果 indexedDB 中没有找到文件，使用扩展的 loadFile 方法
  const loadFile = fileUploadExtension.value?.options?.loadFile

  if (loadFile) {
    try {
      const result = await loadFile(url)
      if (result && 'url' in result) {
        imageUrl.value = result.url
        fileTypeName.value = result.type || '' // 存储文件类型
      }
    }
    catch (extensionError) {
      // 如果扩展方法抛出错误，直接使用原始 URL
      console.warn('扩展加载文件失败，使用原始URL:', extensionError)
    }
  }
  isLoading.value = false
}

// 监听URL变化，加载文件
watch(
  () => nodeProps.value.url,
  (newUrl) => {
    if (newUrl && (isImage.value || isSha256Hash.value)) {
      loadFileWithExtension(newUrl)
    }
    else {
      isLoading.value = false
    }
  },
)

const wrapperStyle = computed(() => {
  if (!isImage.value && !isPictureType.value) {
    return {
      width: '88px',
      height: '88px',
    }
  }
  return containerSize.value
})

// 组件挂载时加载文件
onMounted(() => {
  // 加载文件
  if (nodeProps.value.url && (isImage.value || isSha256Hash.value)) {
    loadFileWithExtension(nodeProps.value.url)
  }
  else {
    isLoading.value = false
  }
})
</script>

<template>
  <NodeViewWrapper
    class="file-upload-wrapper" :class="[{ 'is-selected': selected }]"
    :style="wrapperStyle"
  >
    <div class="file-upload-content w-full h-full">
      <div v-if="isLoading" class="loading-wrapper">
        <div class="loading-spinner" />
      </div>
      <div v-else-if="isImage || isPictureType" class="image-preview">
        <div v-if="!isLoading && hasError" class="error-wrapper">
          <span class="error-text">图片加载失败</span>
        </div>
        <img
          v-else
          ref="imageRef"
          :src="imageUrl"
          :alt="fileType"
          @load="onImageLoad"
          @error="onImageError"
        >
      </div>
      <div v-else class="file-preview">
        <img :src="fileTypeIcon" :alt="fileType">
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.file-upload-wrapper {
  padding: 0;
  padding: 4px;
  display: inline-block;
  /* transition: all 20s ease; */
  position: relative;
}
.file-upload-content {
  /* border: 1px solid #ddd; */
  box-shadow: 0 0 0 1px #ddd;
  border-radius: 4px;
}
.file-upload-content .file-upload-wrapper.is-selected {
  border-color: #2196f3;
  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
}

.image-preview,
.file-preview {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
}

.file-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.loading-wrapper,
.error-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border-radius: 4px;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #ddd;
  border-top-color: #2196f3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.error-text {
  color: #f44336;
  font-size: 14px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
