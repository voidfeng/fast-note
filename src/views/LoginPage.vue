<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonInput,
  IonList,
} from '@ionic/vue'
import { inject } from 'vue';

const noteDesktop = inject('noteDesktop')
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
    <ion-content :fullscreen="true">
      <div 
        
        class="px4 flex items-center justify-center h-full"
      >
        <IonList :class="{'w-full': !noteDesktop, 'w-90': noteDesktop}">
          <h1 class="text-center">用户登录</h1>
          <div class="h4"></div>
          <ion-input
            label="用户名"
            label-placement="floating"
            fill="outline"
            placeholder="请输入用户名"
            mode="md"
          />
          <div class="h4"></div>
          <ion-input
            label="密码"
            label-placement="floating"
            fill="outline"
            placeholder="请输入密码"
            type="password"
            mode="md"
          />
          <div class="h4"></div>
          <ion-button expand="block">登录</ion-button>
          <div class="h64"></div>
        </IonList>
      </div>
    </ion-content>
  </ion-page>
</template>
