import { mergeAttributes } from '@tiptap/core'
import { Table } from '@tiptap/extension-table'

/**
 * 自定义Table扩展，在表格外层添加滚动容器
 * 继承自官方的Table扩展，增强横向滚动功能
 */
export const TableWithWrapper = Table.extend({
  name: 'table',

  // 自定义渲染HTML，在table外层包裹一个div
  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
    return [
      'div',
      { class: 'table-wrapper' },
      [
        'table',
        mergeAttributes(HTMLAttributes),
        ['tbody', 0],
      ],
    ]
  },

  // 解析HTML时也需要处理wrapper
  parseHTML() {
    return [
      {
        tag: 'table',
        // 优先级高于默认的table解析
        priority: 51,
      },
      // 也支持从带wrapper的HTML中解析
      {
        tag: 'div.table-wrapper',
        // 跳过wrapper，直接解析内部的table
        skip: true,
      },
    ]
  },
})
