import { useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import { Alert, Box, Stack, Tab, Tabs, useMediaQuery, useTheme } from '@mui/material'
import { useI18n } from '../i18n'
import { api, Page, TopicItem } from '../api'
import { CheckinCard, ScoreBoard, Status, TopicList, useAsync } from '../components'

const TABS = ['all', 'good', 'newest', 'hot', 'noanswer'] as const

export default function Home() {
  const { t } = useI18n()
  // 电脑端：积分榜放在话题列表右边
  const wide = useMediaQuery(useTheme().breakpoints.up('md'))
  const [sp, setSp] = useSearchParams()
  const [boardKey, setBoardKey] = useState(0) // 签到后刷新积分榜
  const tab = sp.get('tab') || 'all'
  const pageNo = Number(sp.get('pageNo') || 1)
  const { data, loading, error } = useAsync(
    () => api.get<Page<TopicItem>>(`/api/?tab=${tab}&pageNo=${pageNo}`), [tab, pageNo])
  const main = (
    <>
      {sp.get('active') === 'true' && <Alert severity="success" sx={{ mb: 2 }}>{t('activated')}</Alert>}
      <Tabs value={tab} onChange={(_, v) => setSp({ tab: v })} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile sx={{ mb: 2 }}>
        {TABS.map((v) => <Tab key={v} value={v} label={t(v)} />)}
      </Tabs>
      <Status loading={loading} error={error} />
      {data && <TopicList page={data} onPage={(n) => setSp({ tab, pageNo: String(n) })} />}
    </>
  )
  if (!wide) return <><Box sx={{ mb: 2 }}><CheckinCard /></Box>{main}</>
  return (
    <Box sx={{ display: 'flex', gap: 3 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>{main}</Box>
      <Box sx={{ width: 300, flexShrink: 0 }}>
        {/* 签到卡片 + 积分榜一起固定在右侧；窗口不够高时积分榜在剩下的高度里滚动 */}
        <Stack spacing={2} sx={{ position: 'sticky', top: 72, maxHeight: 'calc(100vh - 96px)' }}>
          <CheckinCard onCheckedIn={() => setBoardKey((k) => k + 1)} />
          <ScoreBoard compact refreshKey={boardKey} />
        </Stack>
      </Box>
    </Box>
  )
}
