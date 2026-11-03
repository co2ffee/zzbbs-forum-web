import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import { Box, List, ListItem, ListItemText, Pagination, Paper } from '@mui/material'
import { api, Page } from '../api'
import { useI18n } from '../i18n'
import { Status, Title, useAsync } from '../components'

export default function Search() {
  const { t } = useI18n()
  const [sp, setSp] = useSearchParams()
  const keyword = sp.get('keyword') || ''
  const pageNo = Number(sp.get('pageNo') || 1)
  const { data, loading, error } = useAsync(
    () => keyword ? api.get<Page<{ id: number; title: string }>>(`/api/search?keyword=${encodeURIComponent(keyword)}&pageNo=${pageNo}`) : Promise.resolve(null),
    [keyword, pageNo])
  const pages = data ? Math.max(1, Math.ceil(data.total / data.size)) : 1
  return (
    <>
      <Title>{t('searchResult')}：{keyword}</Title>
      <Status loading={loading} error={error} />
      {data && (
        <Paper>
          <List disablePadding>
            {data.records.map((r) => (
              <ListItem key={r.id} divider component={RouterLink} to={`/topic/${r.id}`} sx={{ color: 'inherit' }}>
                <ListItemText primary={r.title} />
              </ListItem>
            ))}
            {data.records.length === 0 && <ListItem><ListItemText secondary={t('empty')} /></ListItem>}
          </List>
          {pages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <Pagination count={pages} page={data.current} onChange={(_, n) => setSp({ keyword, pageNo: String(n) })} />
            </Box>
          )}
        </Paper>
      )}
    </>
  )
}
