import { ReactNode, useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Alert, Avatar, Box, Button, Chip, CircularProgress, List, ListItem, ListItemAvatar, ListItemText, Pagination, Paper, Stack, Typography,
} from '@mui/material'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'
import { api, fmtTime, Page, TopicItem, uploadFiles, User } from './api'
import { useAuth } from './auth'
import { useI18n } from './i18n'
import { useSite } from './site'

// html: true —— 话题里的视频是 <video> 标签（旧页面上传视频就是插入这种 HTML），需要保留原始 HTML。
// 安全完全靠下面的 DOMPurify 净化：只放行文章需要的标签，去掉脚本、事件属性、javascript: 链接、表单、样式等。
const md = new MarkdownIt({ html: true, linkify: true, breaks: true })

const PURIFY_CONFIG = {
  ADD_TAGS: ['video', 'source'],
  ADD_ATTR: ['controls', 'src', 'type', 'poster', 'target'],
  // 表单/输入框可以被用来做钓鱼；style 属性可以做遮罩层覆盖整个页面；其余是常见的注入载体
  FORBID_TAGS: ['form', 'input', 'button', 'textarea', 'select', 'option', 'style', 'iframe', 'object', 'embed', 'link', 'meta', 'base'],
  FORBID_ATTR: ['style'],
}

// 外链统一在新窗口打开，并且不把来源页面信息带过去
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('href')) {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

// @用户名 转成个人主页链接（跳过代码块里的内容太复杂，这里只处理行内普通文本）
const mention = (text: string) => text.replace(/(^|[\s>])@([A-Za-z0-9]{2,16})(?=$|[\s,.;:!?，。！？])/g, '$1[@$2](/user/$2)')

export function Markdown({ text, style }: { text: string; style?: string }) {
  // style=RICH 的历史内容是 HTML，MD 是 markdown，统一消毒后渲染
  const html = style === 'RICH' ? text : md.render(mention(text || ''))
  return <Box className="md" sx={{ '& img, & video': { maxWidth: '100%' }, '& pre': { overflow: 'auto', p: 1, bgcolor: 'grey.100' } }}
    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html, PURIFY_CONFIG) }} />
}

// 通用异步加载
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    fn().then((d) => alive && setData(d)).catch((e) => alive && setError(e.message)).finally(() => alive && setLoading(false))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return { data, error, loading, setData }
}

export function Status({ loading, error }: { loading: boolean; error: string }) {
  if (loading) return <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>
  if (error) return <Alert severity="error">{error}</Alert>
  return null
}

export function TopicList({ page, onPage }: { page: Page<TopicItem>; onPage: (n: number) => void }) {
  const pages = Math.max(1, Math.ceil(page.total / page.size))
  return (
    <Paper>
      <List disablePadding>
        {page.records.map((t) => (
          <ListItem key={t.id} divider component={RouterLink} to={`/topic/${t.id}`} sx={{ color: 'inherit' }}>
            <ListItemAvatar><Avatar src={t.avatar}>{t.username?.[0]}</Avatar></ListItemAvatar>
            <ListItemText
              primary={<Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                {t.top && <Chip size="small" color="warning" label="置顶" />}
                {t.good && <Chip size="small" color="success" label="精华" />}
                <span>{t.title}</span>
              </Stack>}
              secondary={`${t.username} · ${fmtTime(t.inTime)} · ${t.commentCount} 评论 · ${t.view} 浏览`}
            />
          </ListItem>
        ))}
        {page.records.length === 0 && <ListItem><ListItemText secondary="暂无内容" /></ListItem>}
      </List>
      {pages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <Pagination count={pages} page={page.current} onChange={(_, n) => onPage(n)} />
        </Box>
      )}
    </Paper>
  )
}

export function Captcha({ onRefresh }: { onRefresh?: () => void }) {
  const [k, setK] = useState(Date.now())
  void onRefresh
  return <img src={`/common/captcha?${k}`} alt="captcha" style={{ height: 40, cursor: 'pointer' }} onClick={() => setK(Date.now())} title="点击刷新" />
}

export const Title = ({ children }: { children: ReactNode }) => <Typography variant="h5" sx={{ mb: 2 }}>{children}</Typography>

// 上传图片/视频按钮：话题、评论的输入框共用。上传成功后把 markdown 图片 / <video> 标签交给 onInsert，由调用方追加到内容末尾。
export function UploadButtons({ onInsert }: { onInsert: (snippet: string) => void }) {
  const { t } = useI18n()
  const site = useSite()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const upload = async (file: File | undefined, type: 'topic' | 'video') => {
    if (!file) return
    setErr('')
    setBusy(true)
    try {
      const limit = Number(type === 'video' ? site.uploadVideoSizeLimit : site.uploadImageSizeLimit) || undefined
      const [url] = await uploadFiles([file], type, limit)
      onInsert(type === 'video' ? `<video controls src="${url}"></video>` : `![](${url})`)
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }
  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Button component="label" size="small" variant="outlined" disabled={busy}>{t('uploadImage')}
          <input hidden type="file" accept="image/*" onChange={(e) => { upload(e.target.files?.[0], 'topic'); e.target.value = '' }} />
        </Button>
        <Button component="label" size="small" variant="outlined" disabled={busy}>{t('uploadVideo')}
          <input hidden type="file" accept="video/mp4" onChange={(e) => { upload(e.target.files?.[0], 'video'); e.target.value = '' }} />
        </Button>
        {busy && <CircularProgress size={18} />}
      </Stack>
      {err && <Alert severity="error" onClose={() => setErr('')}>{err}</Alert>}
    </Stack>
  )
}

// 把片段追加到内容末尾（前面不是换行就先换一行）
export const appendSnippet = (content: string, snippet: string) =>
  `${content}${content && !content.endsWith('\n') ? '\n' : ''}${snippet}\n`

// 积分榜：电脑端放在首页话题列表右边（compact），窄屏仍然是 /top100 单独页面
export function ScoreBoard({ compact = false, refreshKey = 0 }: { compact?: boolean; refreshKey?: number }) {
  const { t } = useI18n()
  const { data, loading, error } = useAsync(() => api.get<User[]>('/api/top100'), [refreshKey])
  return (
    // compact 时由外层容器负责固定在右侧（和签到卡片一起），这里只负责在剩余高度里滚动
    <Paper sx={compact ? { flex: 1, minHeight: 0, overflowY: 'auto' } : undefined}>
      {compact && <Typography variant="subtitle1" sx={{ px: 2, py: 1.5, fontWeight: 600 }}>{t('topTen')}</Typography>}
      <Status loading={loading} error={error} />
      {data && (
        <List disablePadding dense={compact}>
          {data.map((u, i) => (
            <ListItem key={u.id} divider={i < data.length - 1} component={RouterLink} to={`/user/${u.username}`} sx={{ color: 'inherit', gap: 1 }}
              secondaryAction={<Typography variant={compact ? 'caption' : 'body1'} color="text.secondary">{t('score')} {u.score ?? 0}</Typography>}>
              <Typography sx={{ width: compact ? 24 : 36, flexShrink: 0 }} color={i < 3 ? 'primary' : 'text.secondary'} variant={compact ? 'body2' : 'body1'}>{i + 1}</Typography>
              <ListItemAvatar sx={{ minWidth: 0 }}><Avatar src={u.avatar} sx={compact ? { width: 28, height: 28 } : undefined}>{u.username[0]}</Avatar></ListItemAvatar>
              <ListItemText primary={u.username} slotProps={{ primary: { noWrap: true } }} sx={{ minWidth: 0, pr: compact ? 5 : 0 }} />
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  )
}

interface CheckinStatus { enabled: boolean; checkedIn: boolean; todayScore?: number | null; streak: number; scoreMin: number; scoreMax: number }

// 每日签到：每天随机获得积分，范围由后台设置。后端没开启、接口还没上线、请求失败时整块隐藏，不影响首页。
export function CheckinCard({ onCheckedIn }: { onCheckedIn?: () => void }) {
  const { t } = useI18n()
  const { updateUser } = useAuth()
  const [st, setSt] = useState<CheckinStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    let alive = true
    api.get<CheckinStatus>('/api/checkin/status').then((d) => alive && setSt(d)).catch(() => {})
    return () => { alive = false }
  }, [])

  if (!st || !st.enabled) return null

  const doCheckin = async () => {
    if (busy || st.checkedIn) return
    setBusy(true)
    setMsg(null)
    try {
      const r = await api.post<{ score: number; streak: number; totalScore: number }>('/api/checkin')
      setSt({ ...st, checkedIn: true, todayScore: r.score, streak: r.streak })
      updateUser({ score: r.totalScore })
      setMsg({ ok: true, text: t('checkinGot', String(r.score)) })
      onCheckedIn?.()
    } catch (e: any) {
      setMsg({ ok: false, text: e.message })
      // 可能是别处已经签过了：刷新一下状态
      api.get<CheckinStatus>('/api/checkin/status').then(setSt).catch(() => {})
    } finally { setBusy(false) }
  }

  const range = st.scoreMin === st.scoreMax
    ? t('checkinFixed', String(st.scoreMin))
    : t('checkinRange', String(st.scoreMin), String(st.scoreMax))
  return (
    <Paper sx={{ p: 2, flexShrink: 0 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{t('checkin')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {st.checkedIn ? t('checkinToday', String(st.todayScore ?? 0)) : range}
        {st.streak > 0 && ` · ${t('checkinStreak', String(st.streak))}`}
      </Typography>
      <Button fullWidth variant="contained" disabled={busy || st.checkedIn} onClick={doCheckin}>
        {st.checkedIn ? t('checkedInBtn') : t('checkinBtn')}
      </Button>
      {msg && <Alert severity={msg.ok ? 'success' : 'error'} sx={{ mt: 1 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}
    </Paper>
  )
}
