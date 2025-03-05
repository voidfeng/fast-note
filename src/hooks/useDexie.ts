import Dexie from "dexie";
import { ref } from "vue";

const db = ref<Dexie>()

export function useDexie() {
  function init() {
    db.value = new Dexie("note");

    // 定义表结构和索引
    db.value.version(1).stores({
      categorys: "++id, title, newstime, type, pid",
      notes: "++id, title, newstext",
    });

    db.value.categorys.add({
      id: 1,
      title: "全部",
      newstime: Date.now(),
      type: "folder",
      pid: 0,
    });
  }

  return {
    db,
    init,
  }
}
