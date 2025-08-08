// 按层级排序笔记，确保父笔记在子笔记之前
export function sortNotesByHierarchy(notes: any[]): any[] {
  const noteMap = new Map(notes.map(note => [note.uuid, note]))
  const sorted: any[] = []
  const visited = new Set<string>()

  // 深度优先遍历，确保父笔记先被添加
  function addNoteWithParents(note: any) {
    if (visited.has(note.uuid)) {
      return
    }

    // 如果有父笔记且父笔记在待上传列表中，先添加父笔记
    if (note.puuid && noteMap.has(note.puuid)) {
      addNoteWithParents(noteMap.get(note.puuid))
    }

    // 添加当前笔记
    if (!visited.has(note.uuid)) {
      sorted.push(note)
      visited.add(note.uuid)
    }
  }

  // 遍历所有笔记
  for (const note of notes) {
    addNoteWithParents(note)
  }

  return sorted
}
