import { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import { api } from './api'

// 站点公开配置，对应后端 GET /api/site
export interface SiteInfo {
  name?: string
  baseUrl?: string
  pageSize?: string
  contentStyle?: string
  uploadImageSizeLimit?: string
  uploadVideoSizeLimit?: string
  websocket?: string
  websocketUrl?: string
  smsEnabled: boolean
  socials: string[]
}
const Ctx = createContext<SiteInfo>({ smsEnabled: false, socials: [] })
export const useSite = () => useContext(Ctx)

export function SiteProvider({ children }: { children: ReactNode }) {
  const [site, setSite] = useState<SiteInfo>({ smsEnabled: false, socials: [] })
  useEffect(() => {
    api.get<SiteInfo>('/api/site').then((s) => {
      setSite(s)
      if (s.name) document.title = s.name
    }).catch(() => {})
  }, [])
  return <Ctx.Provider value={site}>{children}</Ctx.Provider>
}
