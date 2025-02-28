<template>
  <node-view-wrapper class="upload-file">
    <div class="drag-handle" contenteditable="false" draggable="true" data-drag-handle>封面</div>
  </node-view-wrapper>
</template>

<script lang="ts" setup>
import { NodeViewContent, nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'
import { onMounted, watch } from 'vue'

const props = defineProps(nodeViewProps)

watch(
  () => props.selected,
  (newVal) => {
    if (newVal) {
      console.log('已被选中')
    }
  },
)
window.aa = props
onMounted(() => {
  console.log(props)
  setInterval(() => {
    console.log(props.selected)
  }, 500)
})
</script>

<style lang="scss">
.upload-file {
  width: 200px;
  height: 200px;
  padding: 0.5rem;
  margin: 0.5rem 0;
  border-radius: 0.5rem;
  background: white;
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.05),
    0px 10px 20px rgba(0, 0, 0, 0.1);

  .drag-handle {
    flex: 0 0 auto;
    position: relative;
    width: 100%;
    height: 100%;
    top: 0.3rem;
    margin-right: 0.5rem;
    cursor: grab;
    background-repeat: no-repeat;
    background-size: contain;
    background-position: center;
  }

  .content {
    flex: 1 1 auto;
  }
}
</style>
