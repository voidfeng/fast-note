<script setup lang="ts">
import { IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton } from '@ionic/vue'
</script>

<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button text="返回" default-href="/" />
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true"></ion-content>
  </ion-page>
</template>
