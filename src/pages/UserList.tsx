import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom'
import { Box, Button, Pagination } from '@mui/material'
import { api, Page, TopicItem, User } from '../api'
import { useI18n } from '../i18n'
import { Status, Title, TopicList, useAsync } from '../components'
import { CommentList } from './Profile'

type Tab = 'topics' | 'comments' | 'collects'

// /user/:username/topics | comments | collects
export default function UserList() {
  const { t } = useI18n()
  const { username = '', tab = 'topics' } = useParams<{ username: string; tab: Tab }>()
  const [sp, setSp] = useSearchParams()
  const pageNo = Number(sp.get('pageNo') || 1)
  const { data, loading, error } = useAsync(
    () => api.get<{ user: User } & Record<string, Page<any>>>(`/api/user/${encodeURIComponent(username)}/${tab}?pageNo=${pageNo}`),
    [username, tab, pageNo])
  const page = data?.[tab]
  const label = tab === 'comments' ? t('comments') : tab === 'collects' ? t('collects') : t('topics')
  return (
    <>
      <Title>{username} · {label}</Title>
      <Button component={RouterLink} to={`/user/${encodeURIComponent(username)}`} sx={{ mb: 1 }}>← {username}</Button>
      <Status loading={loading} error={error} />
      {page && (tab === 'comments' ? (
        <>
          <CommentList records={page.records} />
          {page.total > page.size && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <Pagination count={Math.ceil(page.total / page.size)} page={page.current} onChange={(_, n) => setSp({ pageNo: String(n) })} />
            </Box>
          )}
        </>
      ) : <TopicList page={page as Page<TopicItem>} onPage={(n) => setSp({ pageNo: String(n) })} />)}
    </>
  )
}
