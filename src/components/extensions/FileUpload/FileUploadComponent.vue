<template>
  <node-view-wrapper
    :class="['file-upload-wrapper', { 'is-selected': selected }]"
    :style="wrapperStyle"
  >
    <div class="file-upload-content">
      <div v-if="isImage" class="image-preview">
        <div v-if="!imageLoaded" class="loading-wrapper">
          <div class="loading-spinner"></div>
        </div>
        <img v-if="imageLoaded" :src="nodeProps.url" :alt="nodeProps.localId" ref="imageRef" />
      </div>
      <div v-else class="file-preview">
        <img :src="fileTypeIcon" :alt="fileType" />
      </div>
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
  selected: {
    type: Boolean,
    default: false,
  },
})

const nodeProps = computed(() => ({
  url: props.node.attrs.url,
  localId: props.node.attrs.localId,
}))

const isImage = computed(() => {
  const url = nodeProps.value.url
  return url?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
})

const fileType = computed(() => {
  if (isImage.value) return 'picture'

  const url = nodeProps.value.url
  const extension = url?.split('.')?.pop()?.toLowerCase()

  const typeMap: Record<string, string> = {
    xlsx: 'excel',
    xls: 'excel',
    ai: 'ai',
    mp3: 'audio',
    wav: 'audio',
    doc: 'doc',
    docx: 'doc',
    pdf: 'pdf',
    ppt: 'ppt',
    pptx: 'ppt',
    psd: 'psd',
    rtf: 'rtf',
    txt: 'txt',
    mp4: 'video',
    avi: 'video',
    mov: 'video',
    zip: 'zip',
    rar: 'zip',
    '7z': 'zip',
  }

  return typeMap[extension || ''] || 'unknown'
})

const fileTypeIcon = computed(() => {
  return `/file/${fileType.value}.svg`
})

const imageRef = ref<HTMLImageElement | null>(null)
const imageLoaded = ref(false)
const containerSize = ref({ width: '86px', height: '86px' })

const preloadImage = () => {
  const img = new Image()
  img.onload = () => {
    const aspectRatio = img.naturalWidth / img.naturalHeight

    if (aspectRatio >= 1) {
      // 宽图，以宽度200px为基准
      containerSize.value = {
        width: '200px',
        height: `${200 / aspectRatio}px`,
      }
    } else {
      // 高图，以高度200px为基准
      containerSize.value = {
        width: `${200 * aspectRatio}px`,
        height: '200px',
      }
    }

    imageLoaded.value = true
  }
  img.src = nodeProps.value.url
}

// 添加 watch 来监听 url 变化并触发预加载
watch(
  () => nodeProps.value.url,
  (newUrl) => {
    if (newUrl && isImage.value) {
      imageLoaded.value = false
      preloadImage()
    }
  },
  { immediate: true },
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
</script>

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
.file-upload-content .file-upload-wrapper.is-selected  {
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

.loading-wrapper {
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

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
