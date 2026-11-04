import { useState } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import {
  Alert, Avatar, Box, Button, Chip, Divider, IconButton, Paper, Stack, TextField, Typography,
} from '@mui/material'
import ThumbUpIcon from '@mui/icons-material/ThumbUp'
import { api, CommentNode, fmtTime, Tag, User } from '../api'
import { useAuth } from '../auth'
import { useI18n } from '../i18n'
import { appendSnippet, Markdown, Status, UploadButtons, useAsync } from '../components'

interface Detail {
  topic: { id: number; title: string; content: string; style?: string; inTime: string; view: number; userId: number; upIds?: string; top?: boolean; good?: boolean }
  tags: Tag[]
  comments: CommentNode[]
  topicUser: User
  collects: unknown[]
  collect?: unknown
  otherTopics?: { id: number; title: string }[]
}

const count = (ids?: string) => (ids ? ids.split(',').filter(Boolean).length : 0)

function flatten(list: CommentNode[], out: CommentNode[] = []) {
  for (const c of list) {
    out.push(c)
    if (c.children) Object.values(c.children).forEach((arr) => flatten(arr, out))
  }
  return out
}

export default function TopicDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const { t } = useI18n()
  const nav = useNavigate()
  const { data, loading, error, setData } = useAsync(() => api.get<Detail>(`/api/topic/${id}`), [id])
  const [content, setContent] = useState('')
  const [reply, setReply] = useState<CommentNode | null>(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<{ id: number; content: string } | null>(null)

  // 点赞/评论等操作后的刷新不重复计浏览数（只有第一次打开详情页计一次）
  const reload = () => api.get<Detail>(`/api/topic/${id}?countView=false`).then(setData)
  const guard = async (fn: () => Promise<unknown>) => {
    setMsg('')
    try { await fn() } catch (e: any) { setMsg(e.message) }
  }
  // 点赞/收藏这类“切换式”操作：请求期间禁用按钮，防止连点造成状态不同步
  const toggle = async (fn: () => Promise<unknown>) => {
    if (busy) return
    setBusy(true)
    try { await guard(fn) } finally { setBusy(false) }
  }

  if (loading || error || !data) return <Status loading={loading} error={error} />
  const { topic, tags, comments, topicUser } = data
  const flat = flatten(comments)
  const mine = user && topic.userId === user.id

  return (
    <>
      <Paper sx={{ p: 3, mb: 2 }}>
        <Typography variant="h5">{topic.title}</Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", my: 1 }}>
          <Avatar src={topicUser.avatar} sx={{ width: 24, height: 24 }} />
          <Typography component={RouterLink} to={`/user/${topicUser.username}`} variant="body2">{topicUser.username}</Typography>
          <Typography variant="caption" color="text.secondary">{fmtTime(topic.inTime)} · {topic.view} 浏览</Typography>
          {tags.map((t) => <Chip key={t.id} size="small" label={t.name} component={RouterLink} to={`/topic/tag/${encodeURIComponent(t.name)}`} clickable />)}
        </Stack>
        <Divider sx={{ mb: 2 }} />
        <Markdown text={topic.content} style={topic.style} />
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button size="small" disabled={busy} startIcon={<ThumbUpIcon />} onClick={() => toggle(async () => { if (!user) return nav('/login'); await api.get(`/api/topic/${id}/vote`); await reload() })}>
            {t('like')} {count(topic.upIds)}
          </Button>
          <Button size="small" disabled={busy} onClick={() => toggle(async () => {
            if (!user) return nav('/login')
            data.collect ? await api.del(`/api/collect/${id}`) : await api.post(`/api/collect/${id}`)
            await reload()
          })}>{data.collect ? t('uncollect') : t('collect')} ({data.collects.length})</Button>
          {mine && <>
            <Button size="small" component={RouterLink} to={`/topic/edit/${id}`}>{t('edit')}</Button>
            <Button size="small" color="error" onClick={() => confirm('确定删除该话题？') && guard(async () => { await api.del(`/api/topic/${id}`); nav('/') })}>{t('delete')}</Button>
          </>}
        </Stack>
      </Paper>

      {msg && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>{flat.length} {t('comments')}</Typography>
        {flat.map((c) => (
          <Box key={c.id} sx={{ display: 'flex', gap: 1.5, py: 1.5, pl: Math.min(c.layer ?? 0, 4) * 3, borderTop: 1, borderColor: 'divider' }}>
            <Avatar src={c.avatar} sx={{ width: 32, height: 32 }}>{c.username?.[0]}</Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }} component={RouterLink} to={`/user/${c.username}`}>{c.username}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>{fmtTime(c.inTime)}</Typography>
              {editing?.id === c.id ? (
                <Box sx={{ my: 1 }}>
                  <TextField fullWidth multiline minRows={3} value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })} />
                  <Box sx={{ mt: 1 }}><UploadButtons onInsert={(snippet) => setEditing((ed) => ed && { ...ed, content: appendSnippet(ed.content, snippet) })} /></Box>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Button size="small" variant="contained" onClick={() => guard(async () => { await api.put(`/api/comment/${c.id}`, { content: editing.content }); setEditing(null); await reload() })}>{t('save')}</Button>
                    <Button size="small" onClick={() => setEditing(null)}>{t('cancel')}</Button>
                  </Stack>
                </Box>
              ) : <Markdown text={c.content} />}
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <IconButton size="small" onClick={() => guard(async () => { if (!user) return nav('/login'); await api.get(`/api/comment/${c.id}/vote`); await reload() })}>
                  <ThumbUpIcon fontSize="inherit" />
                </IconButton>
                <Typography variant="caption">{count(c.upIds)}</Typography>
                {user && <Button size="small" onClick={() => setReply(c)}>{t('reply')}</Button>}
                {user && user.id === c.userId && <Button size="small" onClick={() => setEditing({ id: c.id, content: c.content })}>{t('edit')}</Button>}
                {user && user.id === c.userId && (
                  <Button size="small" color="error" onClick={() => confirm('确定删除评论？') && guard(async () => { await api.del(`/api/comment/${c.id}`); await reload() })}>{t('delete')}</Button>
                )}
              </Stack>
            </Box>
          </Box>
        ))}
      </Paper>

      {!!data.otherTopics?.length && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('otherTopics')}</Typography>
          {data.otherTopics.map((o) => (
            <Typography key={o.id} variant="body2" component={RouterLink} to={`/topic/${o.id}`} sx={{ display: 'block', py: 0.25 }}>{o.title}</Typography>
          ))}
        </Paper>
      )}

      {user ? (
        <Paper sx={{ p: 2 }}>
          {reply && <Chip label={`回复 @${reply.username}`} onDelete={() => setReply(null)} sx={{ mb: 1 }} />}
          <TextField fullWidth multiline minRows={3} placeholder={t('commentPlaceholder')} value={content} onChange={(e) => setContent(e.target.value)} />
          <Box sx={{ mt: 1 }}><UploadButtons onInsert={(snippet) => setContent((c) => appendSnippet(c, snippet))} /></Box>
          <Button sx={{ mt: 1 }} variant="contained" disabled={!content.trim()}
            onClick={() => guard(async () => {
              await api.post('/api/comment', { content: reply ? `@${reply.username} ${content}` : content, topicId: id, commentId: reply?.id })
              setContent(''); setReply(null); await reload()
            })}>{t('submitComment')}</Button>
        </Paper>
      ) : (
        <Alert severity="info"><RouterLink to="/login">{t('loginToComment')}</RouterLink></Alert>
      )}
    </>
  )
}
