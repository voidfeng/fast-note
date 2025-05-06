<script setup lang="ts">
import { IonModal } from '@ionic/vue'
import { ref } from 'vue'

withDefaults(defineProps<{
  isOpen: boolean
}>(), {})

defineEmits(['update:isOpen'])

const modalRef = ref()
</script>

<template>
  <IonModal
    ref="modalRef"
    v-bind="$attrs"
    :is-open
    :initial-breakpoint="0.4"
    :breakpoints="[0, 0.4]"
    :backdrop-breakpoint="0.75"
    @did-dismiss="$emit('update:isOpen', false)"
  >
    <div class="h-50" @mousedown.stop.prevent>
      123
    </div>
  </IonModal>
</template>

<style scoped>
/* ion-modal {
  --height: auto;
} */
</style>
