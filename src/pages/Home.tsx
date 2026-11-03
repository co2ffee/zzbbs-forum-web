import { useSearchParams } from 'react-router-dom'
import { Alert, Tab, Tabs } from '@mui/material'
import { useI18n } from '../i18n'
import { api, Page, TopicItem } from '../api'
import { Status, TopicList, useAsync } from '../components'

const TABS = ['all', 'good', 'newest', 'hot', 'noanswer'] as const

export default function Home() {
  const { t } = useI18n()
  const [sp, setSp] = useSearchParams()
  const tab = sp.get('tab') || 'all'
  const pageNo = Number(sp.get('pageNo') || 1)
  const { data, loading, error } = useAsync(
    () => api.get<Page<TopicItem>>(`/api/?tab=${tab}&pageNo=${pageNo}`), [tab, pageNo])
  return (
    <>
      {sp.get('active') === 'true' && <Alert severity="success" sx={{ mb: 2 }}>{t('activated')}</Alert>}
      <Tabs value={tab} onChange={(_, v) => setSp({ tab: v })} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile sx={{ mb: 2 }}>
        {TABS.map((v) => <Tab key={v} value={v} label={t(v)} />)}
      </Tabs>
      <Status loading={loading} error={error} />
      {data && <TopicList page={data} onPage={(n) => setSp({ tab, pageNo: String(n) })} />}
    </>
  )
}
