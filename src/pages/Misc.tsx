import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Alert, Box, Button, CircularProgress, Paper, Stack, TextField } from '@mui/material'
import { api } from '../api'
import { useAuth } from '../auth'
import { useI18n } from '../i18n'
import { appendSnippet, Title, UploadButtons } from '../components'

// /logout
export function Logout() {
  const { logout } = useAuth()
  useEffect(() => { logout() }, []) // eslint-disable-line
  return <Navigate to="/" replace />
}

// /changeLanguage?lang=zh|en —— 切换后回到上一页
export function ChangeLanguage() {
  const { setLang } = useI18n()
  const [sp] = useSearchParams()
  const nav = useNavigate()
  useEffect(() => {
    const l = sp.get('lang')
    if (l === 'zh' || l === 'en') setLang(l)
    nav(-1)
  }, []) // eslint-disable-line
  return null
}

// /active?email=&code= —— 邮件里的激活链接
export function Active() {
  const [sp] = useSearchParams()
  const nav = useNavigate()
  const { user, updateUser } = useAuth()
  const [err, setErr] = useState('')
  useEffect(() => {
    api.get(`/api/active?email=${encodeURIComponent(sp.get('email') || '')}&code=${encodeURIComponent(sp.get('code') || '')}`)
      .then(() => { if (user) updateUser({ active: true }); nav('/?active=true', { replace: true }) })
      .catch((e) => setErr(e.message))
  }, []) // eslint-disable-line
  return err ? <Alert severity="error">{err}</Alert> : <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>
}

// /comment/edit/:id —— 独立的评论编辑页
export function CommentEdit() {
  const { id } = useParams()
  const nav = useNavigate()
  const { t } = useI18n()
  const [content, setContent] = useState('')
  const [topicId, setTopicId] = useState<number | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    api.get<{ comment: { content: string; topicId: number } }>(`/api/comment/${id}`)
      .then((d) => { setContent(d.comment.content); setTopicId(d.comment.topicId) })
      .catch((e) => setErr(e.message))
  }, [id])
  return (
    <Paper sx={{ p: 3 }}>
      <Title>{t('edit')} {t('comments')}</Title>
      <Stack spacing={2}>
        {err && <Alert severity="error">{err}</Alert>}
        <TextField multiline minRows={6} value={content} onChange={(e) => setContent(e.target.value)} />
        <UploadButtons onInsert={(snippet) => setContent((c) => appendSnippet(c, snippet))} />
        <Button variant="contained" disabled={!content.trim()} onClick={async () => {
          try { await api.put(`/api/comment/${id}`, { content }); nav(`/topic/${topicId}`) } catch (e: any) { setErr(e.message) }
        }}>{t('save')}</Button>
      </Stack>
    </Paper>
  )
}
