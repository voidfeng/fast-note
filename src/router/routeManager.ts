import type { Router, RouteRecordRaw } from 'vue-router'

class RouteManager {
  private router: Router | null = null
  private extensionRoutes: Map<string, RouteRecordRaw[]> = new Map()

  setRouter(router: Router) {
    this.router = router
  }

  // 注册扩展路由
  registerExtensionRoutes(extensionName: string, routes: RouteRecordRaw[]) {
    if (!this.router) {
      console.warn('路由器未初始化')
      return
    }

    // 存储扩展路由
    this.extensionRoutes.set(extensionName, routes)

    // 添加路由到路由器
    routes.forEach((route) => {
      this.router!.addRoute(route)
    })

    console.log(`已注册 ${extensionName} 扩展的路由:`, routes)
  }

  // 移除扩展路由
  unregisterExtensionRoutes(extensionName: string) {
    if (!this.router) {
      console.warn('路由器未初始化')
      return
    }

    const routes = this.extensionRoutes.get(extensionName)
    if (routes) {
      routes.forEach((route) => {
        if (route.name) {
          this.router!.removeRoute(route.name)
        }
      })
      this.extensionRoutes.delete(extensionName)
      console.log(`已移除 ${extensionName} 扩展的路由`)
    }
  }

  // 检查路由是否已注册
  hasExtensionRoutes(extensionName: string): boolean {
    return this.extensionRoutes.has(extensionName)
  }

  // 获取扩展路由
  getExtensionRoutes(extensionName: string): RouteRecordRaw[] | undefined {
    return this.extensionRoutes.get(extensionName)
  }
}

export const routeManager = new RouteManager()
