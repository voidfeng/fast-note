<script setup lang="ts">
import { NodeViewWrapper } from '@tiptap/vue-3'
import { computed, onMounted, ref, watch } from 'vue'

interface Extension {
  name: string
  options: {
    loadImage?: (url: string) => Promise<string>
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
const containerSize = ref({ width: '86px', height: '86px' })
const imageUrl = ref('')
const isLoading = ref(false)
const hasError = ref(false)

// 图片加载完成后计算尺寸
function handleImageLoad(event: Event) {
  const img = event.target as HTMLImageElement
  const aspectRatio = img.naturalWidth / img.naturalHeight

  if (aspectRatio >= 1) {
    containerSize.value = {
      width: '200px',
      height: `${200 / aspectRatio}px`,
    }
  }
  else {
    containerSize.value = {
      width: `${200 * aspectRatio}px`,
      height: '200px',
    }
  }
}

// 使用扩展的 loadImage 方法加载图片
async function loadImageWithExtension(url: string) {
  if (!url)
    return

  // 设置加载状态
  isLoading.value = true
  hasError.value = false
  imageUrl.value = url // 默认使用原始URL

  try {
    // 获取 loadImage 方法
    const loadImage = fileUploadExtension.value?.options?.loadImage

    if (!loadImage) {
      // 如果没有 loadImage 方法，直接使用原始 URL
      isLoading.value = false
      return
    }

    // 使用扩展的 loadImage 方法
    try {
      const loadedUrl = await loadImage(url)
      if (loadedUrl) {
        imageUrl.value = loadedUrl
      }
    }
    catch (extensionError) {
      // 如果扩展方法抛出错误，直接使用原始 URL
      console.warn('扩展加载图片失败，使用原始URL:', extensionError)
    }
  }
  catch (error) {
    console.warn('图片加载失败，使用原始URL:', error)
    hasError.value = true
  }
  finally {
    isLoading.value = false
  }
}

// 监听URL变化，加载图片
watch(
  () => nodeProps.value.url,
  (newUrl) => {
    if (newUrl && isImage.value) {
      loadImageWithExtension(newUrl)
    }
  },
)

const wrapperStyle = computed(() => {
  if (!isImage.value) {
    return {
      width: '86px',
      height: '86px',
    }
  }
  return containerSize.value
})

// 组件挂载时加载图片
onMounted(() => {
  if (isImage.value && nodeProps.value.url) {
    loadImageWithExtension(nodeProps.value.url)
  }
})
</script>

<template>
  <NodeViewWrapper
    class="file-upload-wrapper" :class="[{ 'is-selected': selected }]"
    :style="wrapperStyle"
  >
    <div class="file-upload-content">
      <div v-if="isImage" class="image-preview">
        <div v-if="isLoading" class="loading-wrapper">
          <div class="loading-spinner" />
        </div>
        <div v-else-if="hasError" class="error-wrapper">
          <span class="error-text">图片加载失败</span>
        </div>
        <img
          v-else
          ref="imageRef"
          :src="imageUrl"
          :alt="fileType"
          @load="handleImageLoad"
          @error="() => hasError = true"
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
  transition: all 0.2s ease;
  position: relative;
}
.file-upload-content {
  border: 1px solid #ddd;
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
