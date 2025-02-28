<template>
  <ion-page>
    <ion-content>
      <ion-button router-link="/tabs/tab1" router-direction="back">返回</ion-button>
      <div>
        <editor />
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" setup>
  import { IonButton, IonContent, IonPage } from '@ionic/vue';
  import { ref } from 'vue';
  import editor from '@/components/YYEditor.vue'
  const text = ref('这是一段默认文字，您可以在此输入任何内容...');
</script>