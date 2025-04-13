<script setup lang="ts">
import { NodeViewWrapper } from '@tiptap/vue-3'
import { computed, onMounted, ref, watch } from 'vue'

interface Extension {
  name: string
  options: {
    loadFile?: (url: string) => Promise<string>
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

const isImage = computed(() => {
  const url = nodeProps.value.url
  if (!url)
    return false
  const extension = url.split('.').pop()?.toLowerCase()
  return extension?.match(/(jpg|jpeg|png|gif|webp)$/i)
})

const fileType = computed(() => {
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

const fileTypeIcon = computed(() => {
  return `/file/${fileType.value}.svg`
})

const imageRef = ref<HTMLImageElement | null>(null)
const containerSize = ref({ width: '88px', height: '88px' })
const imageUrl = ref('')
const isLoading = ref(true)
const hasError = ref(false)

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

  const loadFile = fileUploadExtension.value?.options?.loadFile

  if (loadFile) {
    // 使用扩展的 loadFile 方法
    try {
      const loadedUrl = await loadFile(url)
      if (loadedUrl) {
        imageUrl.value = loadedUrl
      }
    }
    catch (extensionError) {
      // 如果扩展方法抛出错误，直接使用原始 URL
      console.warn('扩展加载文件失败，使用原始URL:', extensionError)
    }
  }
  isLoading.value = false
}

// 监听URL变化，加载图片
watch(
  () => nodeProps.value.url,
  (newUrl) => {
    if (newUrl && isImage.value) {
      loadFileWithExtension(newUrl)
    }
  },
)

const wrapperStyle = computed(() => {
  if (!isImage.value) {
    return {
      width: '88px',
      height: '88px',
    }
  }
  return containerSize.value
})

// 组件挂载时加载图片
onMounted(() => {
  console.warn('nodeProps.value', nodeProps.value)
  if (isImage.value && nodeProps.value.url) {
    loadFileWithExtension(nodeProps.value.url)
  }
})
</script>

<template>
  <NodeViewWrapper
    class="file-upload-wrapper" :class="[{ 'is-selected': selected }]"
    :style="wrapperStyle"
  >
    <div class="file-upload-content w-full h-full">
      <div v-if="isImage" class="image-preview">
        <div v-if="isLoading" class="loading-wrapper">
          <div class="loading-spinner" />
        </div>
        <div v-else-if="!isLoading && hasError" class="error-wrapper">
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
