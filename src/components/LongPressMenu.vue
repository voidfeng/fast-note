<script lang="ts" setup>
import type { Note } from '@/hooks/useDexie'
import { useNote } from '@/hooks/useNote'
import { getTime } from '@/utils/date'
import { alertController, IonItem, IonLabel, IonList, IonModal } from '@ionic/vue'
import { ref, toRaw, watch } from 'vue'

const props = withDefaults(defineProps <{
  uuid: string
}>(), {})

const emit = defineEmits(['refresh'])

const { getNote, updateNote, getNotesByPUuid } = useNote()

const modal = ref()
const note = ref<Note>()

const dismiss = () => modal.value.$el.dismiss()

const config = ref([
  {
    label: '重命名',
    handler: async () => {
      const alert = await alertController.create({
        header: note.value?.type === 'folder' ? '请输入新的文件夹名称' : '请输入新的标题',
        buttons: [
          { text: '取消', role: 'cancel', handler: () => dismiss() },
          {
            text: '确认',
            handler: async (d) => {
              note.value!.title = d.newFolderName
              note.value!.lastdotime = getTime()
              await updateNote(note.value!.uuid, toRaw(note.value))
              dismiss()
              emit('refresh')
            },
          },
        ],
        inputs: [{ name: 'newFolderName', placeholder: '请输入文件夹名称' }],
      })

      await alert.present()
    },
  },
  {
    label: '删除',
    handler: async () => {
      const alert = await alertController.create({
        header: note.value?.type === 'folder' ? '确定要删除此文件夹吗？' : '要删除此备忘录吗？',
        message: '所有备忘录和子文件夹都将删除，删除后在“最近删除”中保留 30 天',
        buttons: [
          { text: '取消', role: 'cancel', handler: () => dismiss() },
          {
            text: '确认',
            handler: async () => {
              note.value!.isdeleted = 1
              await updateNote(note.value!.uuid, toRaw(note.value))
              const notes = await getNotesByPUuid(note.value!.uuid)
              for (const note of notes) {
                note.isdeleted = 1
                await updateNote(note.uuid, note)
              }
              emit('refresh')
              dismiss()
            },
          },
        ],
      })

      await alert.present()
    },
  },
])

watch(() => props.uuid, () => {
  if (props.uuid) {
    getNote(props.uuid).then((res) => {
      note.value = res
    })
  }
})
</script>

<template>
  <IonModal v-bind="$attrs" id="long-press-menu" ref="modal">
    <div class="long-press-menu">
      <IonList lines="none">
        <IonItem v-for="d in config" :key="d.label" :button="true" :detail="false" @click="d.handler">
          <IonLabel>{{ d.label }}</IonLabel>
        </IonItem>
      </IonList>
    </div>
  </IonModal>
</template>

<style lang="scss">
ion-modal#long-press-menu {
  --width: fit-content;
  --min-width: 250px;
  --height: fit-content;
  --border-radius: 6px;
  --box-shadow: 0 28px 48px rgba(0, 0, 0, 0.4);
}
</style>
