import { useEffect } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { List, ListItem, ListItemText, Paper, Typography } from '@mui/material'
import { api, fmtTime } from '../api'
import { useAuth } from '../auth'
import { useI18n } from '../i18n'
import { Status, Title, useAsync } from '../components'

interface N { id: number; username?: string; action: string; topicId: number; title?: string; inTime: string; content?: string }

const ACTION_KEY = { COMMENT: 'notifyComment', REPLY: 'notifyReply', COLLECT: 'notifyCollect' } as const

export default function Notifications() {
  const { refreshNotRead } = useAuth()
  const { t } = useI18n()
  const { data, loading, error } = useAsync(() => api.get<{ notRead: N[]; read: N[] }>('/api/notification/list'), [])
  useEffect(() => {
    if (data?.notRead.length) api.get('/api/notification/markRead').then(refreshNotRead).catch(() => {})
  }, [data, refreshNotRead])

  const render = (title: string, items: N[]) => (
    <>
      <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>{title}（{items.length}）</Typography>
      <Paper><List disablePadding>
        {items.map((n) => (
          <ListItem key={n.id} divider component={RouterLink} to={`/topic/${n.topicId}`} sx={{ color: 'inherit' }}>
            <ListItemText primary={t(ACTION_KEY[n.action as keyof typeof ACTION_KEY] ?? 'notifyOther', n.username ?? '', n.title ?? '')}
              secondary={`${fmtTime(n.inTime)}${n.content ? ' · ' + n.content.replace(/<[^>]+>/g, '').slice(0, 60) : ''}`} />
          </ListItem>
        ))}
        {items.length === 0 && <ListItem><ListItemText secondary={t('empty')} /></ListItem>}
      </List></Paper>
    </>
  )
  return (
    <>
      <Title>{t('notifications')}</Title>
      <Status loading={loading} error={error} />
      {data && <>{render(t('unread'), data.notRead)}{render(t('read'), data.read)}</>}
    </>
  )
}
