import { useState } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import { Avatar, Box, Button, Paper, Tab, Tabs, Typography } from '@mui/material'
import { useI18n } from '../i18n'
import { api, fmtTime, Page, TopicItem, User } from '../api'
import { useAuth } from '../auth'
import { Status, TopicList, useAsync } from '../components'

type Tabkey = 'topics' | 'comments' | 'collects'

export default function Profile() {
  const { t } = useI18n()
  const { username = '' } = useParams()
  const { user: me } = useAuth()
  const [tab, setTab] = useState<Tabkey>('topics')
  const [pageNo, setPageNo] = useState(1)
  const info = useAsync(() => api.get<{ user: User; collectCount: number }>(`/api/user/${username}`), [username])
  const list = useAsync(
    () => api.get<any>(`/api/user/${username}/${tab}?pageNo=${pageNo}`),
    [username, tab, pageNo])
  const isMe = me?.username === username

  if (info.loading || info.error || !info.data) return <Status loading={info.loading} error={info.error} />
  const u = info.data.user
  const page = list.data?.[tab] as Page<any> | undefined

  return (
    <>
      <Paper sx={{ p: 3, mb: 2, display: 'flex', gap: 2 }}>
        <Avatar src={u.avatar} sx={{ width: 64, height: 64 }}>{u.username[0]}</Avatar>
        <Box>
          <Typography variant="h6">{u.username}</Typography>
          <Typography variant="body2" color="text.secondary">{u.bio || '这个人很懒，什么都没留下'}</Typography>
          <Typography variant="caption" color="text.secondary">{t('score')} {u.score ?? 0} · {fmtTime(u.inTime)} · {t('collects')} {info.data.collectCount}</Typography>
        </Box>
        {isMe && <Button component={RouterLink} to="/settings" sx={{ ml: 'auto', alignSelf: 'flex-start' }}>{t('settings')}</Button>}
      </Paper>
      <Tabs value={tab} onChange={(_, v) => { setTab(v); setPageNo(1) }} sx={{ mb: 2 }}>
        <Tab value="topics" label={t('topics')} /><Tab value="comments" label={t('comments')} /><Tab value="collects" label={t('collects')} />
      </Tabs>
      {(
        <>
          <Status loading={list.loading} error={list.error} />
          {page && (tab === 'comments' ? (
            <Paper>{page.records.map((c: any) => (
              <Box key={c.id} sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography component={RouterLink} to={`/topic/${c.topicId}`}>{c.title}</Typography>
                <Typography variant="body2" color="text.secondary" noWrap>{c.content}</Typography>
                <Typography variant="caption" color="text.secondary">{fmtTime(c.inTime)}</Typography>
              </Box>
            ))}{page.records.length === 0 && <Box sx={{ p: 2 }}>暂无内容</Box>}</Paper>
          ) : <TopicList page={page as Page<TopicItem>} onPage={setPageNo} />)}
        </>
      )}
    </>
  )
}
