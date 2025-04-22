<script lang="ts" setup>
import { alertController, IonItem, IonLabel, IonList, IonModal } from '@ionic/vue'
import { ref } from 'vue'

const emit = defineEmits(['rename'])

const modal = ref()

const dismiss = () => modal.value.$el.dismiss()

async function onRename() {
  const alert = await alertController.create({
    header: '请输入新的文件夹名称',
    buttons: [
      { text: '取消', role: 'cancel', handler: () => dismiss() },
      {
        text: '确认',
        handler: async (d) => {
          emit('rename', d.newFolderName)
          dismiss()
        },
      },
    ],
    inputs: [{ name: 'newFolderName', placeholder: '请输入文件夹名称' }],
  })

  await alert.present()
}
</script>

<template>
  <IonModal v-bind="$attrs" id="long-press-menu" ref="modal">
    <div class="long-press-menu">
      <IonList lines="none">
        <IonItem :button="true" :detail="false" @click="onRename">
          <IonLabel>重命名</IonLabel>
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
