import { Link as RouterLink, useParams } from 'react-router-dom'
import { Avatar, Box, Button, Paper, Stack, Typography } from '@mui/material'
import { useI18n } from '../i18n'
import { api, fmtTime, Page, TopicItem, User } from '../api'
import { useAuth } from '../auth'
import { Status, TopicList, useAsync } from '../components'

interface Detail {
  user: User
  collectCount: number
  topics: Page<TopicItem>
  comments: Page<{ id: number; topicId: number; title?: string; content: string; inTime: string }>
}

// /user/:username —— 个人主页：最近的话题和评论，更多内容链接到 /user/:username/{topics,comments,collects}
export default function Profile() {
  const { t } = useI18n()
  const { username = '' } = useParams()
  const { user: me } = useAuth()
  const { data, loading, error } = useAsync(() => api.get<Detail>(`/api/user/${username}`), [username])
  if (loading || error || !data) return <Status loading={loading} error={error} />
  const u = data.user
  const base = `/user/${encodeURIComponent(username)}`

  return (
    <>
      <Paper sx={{ p: 3, mb: 2, display: 'flex', gap: 2 }}>
        <Avatar src={u.avatar} sx={{ width: 64, height: 64 }}>{u.username[0]}</Avatar>
        <Box>
          <Typography variant="h6">{u.username}</Typography>
          <Typography variant="body2" color="text.secondary">{u.bio || '这个人很懒，什么都没留下'}</Typography>
          <Typography variant="caption" color="text.secondary">{t('score')} {u.score ?? 0} · {fmtTime(u.inTime)}</Typography>
        </Box>
        {me?.username === username && <Button component={RouterLink} to="/settings" sx={{ ml: 'auto', alignSelf: 'flex-start' }}>{t('settings')}</Button>}
      </Paper>

      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Button component={RouterLink} to={`${base}/topics`}>{t('topics')}</Button>
        <Button component={RouterLink} to={`${base}/comments`}>{t('comments')}</Button>
        <Button component={RouterLink} to={`${base}/collects`}>{t('collects')} ({data.collectCount})</Button>
      </Stack>

      <Typography variant="subtitle1" sx={{ mb: 1 }}>{t('topics')}</Typography>
      <TopicList page={data.topics} onPage={() => { /* 翻页请去 /user/:username/topics */ }} />
      <Button component={RouterLink} to={`${base}/topics`} sx={{ mt: 1 }}>→</Button>

      <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>{t('comments')}</Typography>
      <CommentList records={data.comments.records} />
      <Button component={RouterLink} to={`${base}/comments`} sx={{ mt: 1 }}>→</Button>
    </>
  )
}

export function CommentList({ records }: { records: { id: number; topicId: number; title?: string; content: string; inTime: string }[] }) {
  const { t } = useI18n()
  return (
    <Paper>
      {records.map((c) => (
        <Box key={c.id} sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography component={RouterLink} to={`/topic/${c.topicId}`}>{c.title}</Typography>
          <Typography variant="body2" color="text.secondary" noWrap>{c.content}</Typography>
          <Typography variant="caption" color="text.secondary">{fmtTime(c.inTime)}</Typography>
        </Box>
      ))}
      {records.length === 0 && <Box sx={{ p: 2 }}>{t('empty')}</Box>}
    </Paper>
  )
}
