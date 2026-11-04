import { ReactNode, useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Alert, Avatar, Box, Button, Chip, CircularProgress, List, ListItem, ListItemAvatar, ListItemText, Pagination, Paper, Stack, Typography,
} from '@mui/material'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'
import { fmtTime, Page, TopicItem, uploadFiles } from './api'
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
