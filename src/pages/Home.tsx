import { useSearchParams } from 'react-router-dom'
import { Alert, Box, Tab, Tabs, useMediaQuery, useTheme } from '@mui/material'
import { useI18n } from '../i18n'
import { api, Page, TopicItem } from '../api'
import { ScoreBoard, Status, TopicList, useAsync } from '../components'

const TABS = ['all', 'good', 'newest', 'hot', 'noanswer'] as const

export default function Home() {
  const { t } = useI18n()
  // 电脑端：积分榜放在话题列表右边
  const wide = useMediaQuery(useTheme().breakpoints.up('md'))
  const [sp, setSp] = useSearchParams()
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
  if (!wide) return main
  return (
    <Box sx={{ display: 'flex', gap: 3 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>{main}</Box>
      <Box sx={{ width: 300, flexShrink: 0 }}><ScoreBoard compact /></Box>
    </Box>
  )
}
