import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { api, getToken, setToken, UNAUTHORIZED_EVENT, User } from './api'
import { useSite } from './site'

interface AuthCtx {
  user: User | null
  notRead: number
  login: (user: User, token: string) => void
  logout: () => void
  updateUser: (u: Partial<User>) => void
  refreshNotRead: () => void
  clearNotRead: () => void
}
const Ctx = createContext<AuthCtx>(null as any)
export const useAuth = () => useContext(Ctx)

const USER_KEY = 'zzbbs_user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const site = useSite()
  const [user, setUser] = useState<User | null>(() => {
    try {
      return getToken() ? JSON.parse(localStorage.getItem(USER_KEY) || 'null') : null
    } catch {
      return null
    }
  })
  const [notRead, setNotRead] = useState(0)
  const wsRef = useRef<WebSocket | null>(null)

  const login = (u: User, token: string) => {
    setToken(token)
    localStorage.setItem(USER_KEY, JSON.stringify(u))
    setUser(u)
  }
  const logout = () => {
    setToken(null)
    localStorage.removeItem(USER_KEY)
    setUser(null)
    setNotRead(0)
  }
  const updateUser = (patch: Partial<User>) =>
    setUser((u) => {
      if (!u) return u
      const next = { ...u, ...patch }
      localStorage.setItem(USER_KEY, JSON.stringify(next))
      return next
    })
  const refreshNotRead = useCallback(() => {
    if (!getToken()) return
    api.get<number>('/api/notification/notRead').then(setNotRead).catch(() => {})
  }, [])
  const clearNotRead = useCallback(() => setNotRead(0), [])

  // 任意接口返回 401（token 失效）时回到未登录状态，路由守卫会跳到登录页
  useEffect(() => {
    const onUnauthorized = () => { localStorage.removeItem(USER_KEY); setUser(null); setNotRead(0) }
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [])

  // 未读数：站点开启 websocket 时实时推送（协议同旧前台），否则每分钟轮询
  useEffect(() => {
    if (!user) return
    refreshNotRead()
    if (site.websocket === '1' && site.websocketUrl && 'WebSocket' in window) {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws'
      // 配置里的是后端自己的地址，同域部署时用当前域名的 /websocket 更稳
      const url = `${proto}://${location.host}/websocket`
      const ws = new WebSocket(url)
      wsRef.current = ws
      const emit = (type: string, payload: unknown) => ws.readyState === 1 && ws.send(JSON.stringify({ type, payload }))
      let initial = true // 绑定后第一次 notification_notread 是总数，之后的推送是增量
      ws.onopen = () => emit('bind', { userId: user.id, username: user.username })
      ws.onmessage = (ev) => {
        try {
          const d = JSON.parse(ev.data)
          if (d.type === 'bind') { initial = true; emit('notReadCount', {}) }
          else if (d.type === 'notification_notread') {
            const add = Number(d.payload) || 0
            if (initial) { initial = false; setNotRead(add) } else setNotRead((n) => n + add)
          }
        } catch { /* ignore */ }
      }
      return () => { ws.close(); wsRef.current = null }
    }
    const timer = setInterval(refreshNotRead, 60000)
    return () => clearInterval(timer)
  }, [user, site.websocket, site.websocketUrl, refreshNotRead])

  return (
    <Ctx.Provider value={{ user, notRead, login, logout, updateUser, refreshNotRead, clearNotRead }}>{children}</Ctx.Provider>
  )
}
