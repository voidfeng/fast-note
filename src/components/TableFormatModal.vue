<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { IonIcon, IonItem, IonLabel, IonList, IonModal } from '@ionic/vue'
import { trashOutline } from 'ionicons/icons'
import { onMounted, ref } from 'vue'
import Icon from './Icon.vue'

/**
 * 表格操作项：
 * 1. 插入表格
 * 2. 插入列（后面）
 * 3. 插入行（后面）
 * 4. 删除表格
 * 5. 删除行
 * 6. 删除列
 * 7. 拷贝行
 * 8. 拷贝列
 * 9. 剪切行
 * 10. 剪切列
 * 11. 粘贴行
 * 12. 粘贴列
 */

withDefaults(defineProps<{
  isOpen: boolean
  editor: Editor
}>(), {})

defineEmits(['update:isOpen'])

const modalHeight = 261
const modalHeightPecent = ref(0.35)
const modalRef = ref()

onMounted(() => {
  modalHeightPecent.value = modalHeight / window.innerHeight
})
</script>

<template>
  <IonModal
    ref="modalRef"
    v-bind="$attrs"
    :is-open
    :initial-breakpoint="modalHeightPecent"
    :breakpoints="[0, modalHeightPecent]"
    :backdrop-breakpoint="0.75"
    class="table-format-modal"
    @did-dismiss="$emit('update:isOpen', false)"
  >
    <IonList class="table-format-modal-list" inset>
      <IonItem @click="editor.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: false }).run()">
        <IonLabel>插入表格</IonLabel>
        <div slot="end">
          <Icon name="table" color="danger" />
        </div>
      </IonItem>
      <IonItem @click="editor.chain().focus().deleteTable().run()">
        <IonLabel>删除表格</IonLabel>
        <div slot="end">
          <IonIcon :icon="trashOutline" color="danger" size="small" />
        </div>
      </IonItem>
      <IonItem>
        <IonLabel>插入列</IonLabel>
      </IonItem>
      <IonItem>
        <IonLabel>插入行</IonLabel>
      </IonItem>
      <IonItem>
        <IonLabel>删除行</IonLabel>
      </IonItem>
      <IonItem>
        <IonLabel>删除列</IonLabel>
      </IonItem>
    </IonList>
  </IonModal>
</template>

<style lang="scss">
.table-format-modal {
  --background: #222;
}
.table-format-modal-list {
  ion-item {
    --background: #2c2c2e;
    --border-color: #444348;
  }
}
</style>
