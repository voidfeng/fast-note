<script setup lang="ts">
import { useFileRefs } from '@/hooks/useFileRefs'
import { useFiles } from '@/hooks/useFiles'
import { useNote } from '@/hooks/useNote'
import { IonIcon, IonItem, IonLabel, IonList, IonPopover, useIonRouter } from '@ionic/vue'
import { trashOutline } from 'ionicons/icons'
import { useRoute } from 'vue-router'

const route = useRoute()
const router = useIonRouter()
const { updateNote, getNote } = useNote()
const { getFileRefsByRefid, updateFileRef } = useFileRefs()

async function onDelete() {
  const id = route.params.id
  const note = await getNote(id as string)
  if (note?.uuid) {
    await updateNote(note.uuid, { isDeleted: 1 })
    const fileRefs = await getFileRefsByRefid(id as string)
    if (fileRefs.length > 0) {
      for (const fileRef of fileRefs) {
        await updateFileRef({ ...fileRef, isdeleted: 1 })
      }
    }
    router.back()
  }
}
</script>

<template>
  <IonPopover :dismiss-on-select="true" trigger="more-trigger" trigger-action="click" class="note-more">
    <IonList lines="full">
      <IonItem @click="onDelete">
        <IonLabel class="danger">
          删除
        </IonLabel>
        <IonIcon :icon="trashOutline" color="danger" size="small" />
      </IonItem>
    </IonList>
  </IonPopover>
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
