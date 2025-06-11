<script setup lang="ts">
import type { Note } from '@/hooks/useDexie'
import { IonCol, IonGrid, IonModal, IonRow, useIonRouter } from '@ionic/vue'
import { lockClosed, lockOpen, trashOutline } from 'ionicons/icons'
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import IconTextButton from '@/components/IconTextButton.vue'
import { useFileRefs } from '@/hooks/useFileRefs'
import { useFiles } from '@/hooks/useFiles'
import { useNote } from '@/hooks/useNote'
import { useWebAuthn } from '@/hooks/useWebAuthn'
import { getTime } from '@/utils/date'

withDefaults(defineProps<{
  isOpen: boolean
}>(), {})

const emit = defineEmits(['update:isOpen'])

const route = useRoute()
const router = useIonRouter()
const { updateNote, getNote } = useNote()
const { getFileRefsByRefid, updateFileRef, getFilesRefByHash } = useFileRefs()
const { updateFile, getFile } = useFiles()
const { state, register, verify } = useWebAuthn()

const modalRef = ref()
const note = ref<Note | undefined>(undefined)

async function onWillPresent() {
  note.value = await getNote(route.params.uuid as string)
}

async function onLock() {
  let isPass = false
  if (state.isRegistered) {
    isPass = await verify()
  }
  else {
    isPass = await register()
  }
  if (isPass) {
    if (note.value?.islocked === 1) {
      await updateNote(note.value.uuid, { ...note.value, islocked: 0 })
    }
    else if (note.value) {
      await updateNote(note.value.uuid, { ...note.value, islocked: 1 })
    }
  }
}

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
    emit('update:isOpen', false)
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
    @will-present="onWillPresent"
    @did-dismiss="$emit('update:isOpen', false)"
  >
    <div>
      <IonGrid>
        <IonRow>
          <IonCol size="3" class="grid-item">
            <IconTextButton
              :icon="note?.islocked === 1 ? lockOpen : lockClosed"
              class="text-blue-500"
              :text="note?.islocked === 1 ? '移除' : '锁定'"
              color="primary"
              @click="onLock"
            />
          </IonCol>
          <IonCol size="3" class="grid-item">
            <IconTextButton
              :icon="trashOutline"
              class="danger"
              text="删除"
              color="danger"
              @click="onDelete"
            />
          </IonCol>
        </IonRow>
      </IonGrid>
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
