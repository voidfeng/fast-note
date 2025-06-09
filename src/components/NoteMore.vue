<script setup lang="ts">
import { IonButton, IonIcon, IonItem, IonLabel, IonModal, useIonRouter } from '@ionic/vue'
import { trashOutline } from 'ionicons/icons'
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { useFileRefs } from '@/hooks/useFileRefs'
import { useFiles } from '@/hooks/useFiles'
import { useNote } from '@/hooks/useNote'
import { getTime } from '@/utils/date'

withDefaults(defineProps<{
  isOpen: boolean
}>(), {})

defineEmits(['update:isOpen'])

const route = useRoute()
const router = useIonRouter()
const { updateNote, getNote } = useNote()
const { getFileRefsByRefid, updateFileRef, getFilesRefByHash } = useFileRefs()
const { updateFile, getFile } = useFiles()

const modalRef = ref()
const modalHeightPecent = ref(0.35)

async function onDelete() {
  const uuid = route.params.uuid
  const note = await getNote(uuid as string)
  const now = getTime()
  if (note?.uuid) {
    await updateNote(note.uuid, { ...note, isdeleted: 1, lastdotime: now })
    const fileRefs = await getFileRefsByRefid(note.uuid)
    if (fileRefs.length > 0) {
      for (const fileRef of fileRefs) {
        await updateFileRef({ ...fileRef, isdeleted: 1, lastdotime: now })
        // 重新统计
        const filesRef = await getFilesRefByHash(fileRef.hash)
        if (filesRef.length === filesRef.filter(item => item.isdeleted === 0).length) {
          const file = await getFile(fileRef.hash)
          if (file) {
            await updateFile({ ...file, isdeleted: 1, lastdotime: now })
          }
        }
      }
    }
    router.back()
  }
}
</script>

<template>
  <IonModal
    ref="modalRef"
    v-bind="$attrs"
    :is-open
    :initial-breakpoint="0.5"
    :breakpoints="[0, 0.5, 1]"
    @did-dismiss="$emit('update:isOpen', false)"
  >
    <div>
      <IonButton @click="onDelete">
        <IonIcon :icon="trashOutline" />
      </IonButton>
    </div>
  </IonModal>
</template>

<style lang="scss">
ion-popover.note-more {
  --background: #111;
  --box-shadow: 0 5px 10px 0 rgba(0, 0, 0, 0.6);
}
.note-more {
  .list-ios {
    --ion-item-background: #111;
  }
}
</style>
