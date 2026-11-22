import { useEffect, useState } from 'react'
import {
  Alert, Box, Button, Card, CardActions, CardContent, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControlLabel, Stack, Tab, Tabs, TextField, Typography,
} from '@mui/material'
import { api, fmtTime, uploadFiles } from '../api'
import { useAuth } from '../auth'
import { useI18n } from '../i18n'
import { useSite } from '../site'
import { Status, Title, useAsync } from '../components'
import { Cover, OrderReward, Reward, RewardView } from './Exchange'

interface Item {
  id: number; name: string; image?: string | null; description?: string | null; score: number; unlimited: boolean; stock: number
  soldOut: boolean; sold: number; status: number; delivers?: string[]; sellerName?: string; mine: boolean; reward?: Reward | null
}
interface Purchase { id: number; itemName: string; itemImage?: string; score: number; sellerName?: string; inTime: string; reward?: Reward | null }
interface Sale { id: number; itemName: string; income: number; buyerName?: string; inTime: string }

const rewardKinds = (t: (k: any) => string, d?: string[]) =>
  (d ?? []).map((x) => t(x === 'video' ? 'rewardVideo' : x === 'image' ? 'rewardImage' : 'rewardText')).join('、')

// 用户集市：用户自己上架商品、自己定价，别的用户用积分购买，积分直接转给卖家
export default function Market() {
  const { t } = useI18n()
  const { updateUser } = useAuth()
  const [tab, setTab] = useState<'browse' | 'mine' | 'bought' | 'sold'>('browse')
  const [key, setKey] = useState(0)
  const { data, loading, error } = useAsync(() => api.get<{ items: Item[]; score: number }>('/api/market/items'), [key])
  const [score, setScore] = useState<number | null>(null)
  const [target, setTarget] = useState<Item | null>(null)
  const [got, setGot] = useState<{ name: string; reward: Reward } | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  useEffect(() => { if (data) setScore(data.score ?? 0) }, [data])
  const myScore = score ?? data?.score ?? 0

  const buy = async () => {
    if (!target || busy) return
    setBusy(true)
    try {
      const r = await api.post<{ cost: number; totalScore: number; reward?: Reward | null }>(`/api/market/item/${target.id}/buy`)
      setScore(r.totalScore)
      updateUser({ score: r.totalScore })
      setMsg({ ok: true, text: t('marketBuyOk', String(r.cost)) })
      if (r.reward && (r.reward.text || r.reward.url)) setGot({ name: target.name, reward: r.reward })
    } catch (e: any) {
      setMsg({ ok: false, text: e.message })
    } finally { setBusy(false); setTarget(null); setKey((k) => k + 1) }
  }

  return (
    <>
      <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Title>{t('market')}</Title>
        {data && <Typography color="text.secondary" sx={{ mb: 2 }}>{t('myScore')}：<b>{myScore}</b></Typography>}
      </Stack>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons={false} sx={{ mb: 2 }}>
        <Tab value="browse" label={t('marketBrowse')} />
        <Tab value="mine" label={t('marketMine')} />
        <Tab value="bought" label={t('marketBought')} />
        <Tab value="sold" label={t('marketSold')} />
      </Tabs>
      {msg && <Alert severity={msg.ok ? 'success' : 'error'} sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}

      {tab === 'browse' && (
        <>
          <Status loading={loading} error={error} />
          {data && data.items.length === 0 && <Typography color="text.secondary">{t('marketEmpty')}</Typography>}
          {data && (
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' } }}>
              {data.items.map((i) => {
                const enough = myScore >= i.score
                return (
                  <Card key={i.id} sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Cover name={i.name} image={i.image ?? undefined} />
                    <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>{i.name}</Typography>
                      {i.description && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, wordBreak: 'break-word' }}>{i.description}</Typography>}
                      <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}>
                        <Chip size="small" color="primary" variant="outlined" label={t('exchangeNeed', String(i.score))} />
                        {i.soldOut ? <Chip size="small" label={t('soldOut')} /> : !i.unlimited && <Typography variant="caption" color="text.secondary">{t('exchangeStock', String(i.stock))}</Typography>}
                        {i.mine && <Chip size="small" label={t('marketMineTag')} />}
                      </Stack>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        {t('marketSeller', i.sellerName ?? '')} · {t('marketSoldCount', String(i.sold))}
                      </Typography>
                      {!!i.delivers?.length && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{t('exchangeGets', rewardKinds(t, i.delivers))}</Typography>
                      )}
                    </CardContent>
                    <CardActions sx={{ px: 2, pb: 2 }}>
                      <Button fullWidth variant="contained" disabled={i.mine || i.soldOut || !enough} onClick={() => { setTarget(i); setMsg(null) }}>
                        {i.mine ? t('marketMineTag') : i.soldOut ? t('soldOut') : !enough ? t('notEnough') : t('marketBuy')}
                      </Button>
                    </CardActions>
                  </Card>
                )
              })}
            </Box>
          )}
        </>
      )}
      {tab === 'mine' && <MyItems onChanged={() => setKey((k) => k + 1)} />}
      {tab === 'bought' && <Bought refreshKey={key} />}
      {tab === 'sold' && <Sold refreshKey={key} />}

      <Dialog open={!!got} onClose={() => setGot(null)} fullWidth maxWidth="sm">
        <DialogTitle>{t('marketBoughtTitle')}{got ? `：${got.name}` : ''}</DialogTitle>
        <DialogContent>{got && <RewardView reward={got.reward} />}</DialogContent>
        <DialogActions><Button variant="contained" onClick={() => setGot(null)}>{t('confirm')}</Button></DialogActions>
      </Dialog>
      <Dialog open={!!target} onClose={() => !busy && setTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>{t('marketBuy')}</DialogTitle>
        <DialogContent>{target && <Typography>{t('marketBuyConfirm', String(target.score), target.name, target.sellerName ?? '')}</Typography>}</DialogContent>
        <DialogActions>
          <Button onClick={() => setTarget(null)} disabled={busy}>{t('cancel')}</Button>
          <Button variant="contained" onClick={buy} disabled={busy}>{t('confirm')}</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

function Bought({ refreshKey }: { refreshKey: number }) {
  const { t } = useI18n()
  const { data, loading, error } = useAsync(() => api.get<Purchase[]>('/api/market/orders'), [refreshKey])
  return (
    <>
      <Status loading={loading} error={error} />
      {data && data.length === 0 && <Typography color="text.secondary">{t('marketNoBought')}</Typography>}
      <Stack spacing={1.5}>
        {data?.map((o) => (
          <Card key={o.id}>
            <Stack direction="row" spacing={2} sx={{ p: 1.5, alignItems: 'center' }}>
              <Box sx={{ width: 64, height: 64, flexShrink: 0, borderRadius: 1, overflow: 'hidden' }}><Cover name={o.itemName} image={o.itemImage} /></Box>
              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography sx={{ fontWeight: 600, wordBreak: 'break-word' }}>{o.itemName}</Typography>
                <Typography variant="body2" color="text.secondary">{o.score} {t('score')} · {t('marketSeller', o.sellerName ?? '')} · {fmtTime(o.inTime)}</Typography>
              </Box>
            </Stack>
            {o.reward && (o.reward.text || o.reward.url) && <OrderReward reward={o.reward} />}
          </Card>
        ))}
      </Stack>
    </>
  )
}

function Sold({ refreshKey }: { refreshKey: number }) {
  const { t } = useI18n()
  const { data, loading, error } = useAsync(() => api.get<Sale[]>('/api/market/sales'), [refreshKey])
  return (
    <>
      <Status loading={loading} error={error} />
      {data && data.length === 0 && <Typography color="text.secondary">{t('marketNoSold')}</Typography>}
      <Stack spacing={1}>
        {data?.map((s) => (
          <Card key={s.id} sx={{ p: 1.5 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600, wordBreak: 'break-word' }}>{s.itemName}</Typography>
                <Typography variant="body2" color="text.secondary">{t('marketBuyer', s.buyerName ?? '')} · {fmtTime(s.inTime)}</Typography>
              </Box>
              <Chip color="success" size="small" label={t('marketIncome', String(s.income))} />
            </Stack>
          </Card>
        ))}
      </Stack>
    </>
  )
}

function MyItems({ onChanged }: { onChanged: () => void }) {
  const { t } = useI18n()
  const [k, setK] = useState(0)
  const { data, loading, error } = useAsync(() => api.get<Item[]>('/api/market/my/items'), [k])
  const [editing, setEditing] = useState<Item | 'new' | null>(null)
  const [err, setErr] = useState('')
  const refresh = () => { setK((x) => x + 1); onChanged() }
  const toggle = async (i: Item) => {
    setErr('')
    try { await api.post(`/api/market/item/${i.id}/${i.status === 0 ? 'off' : 'on'}`); refresh() } catch (e: any) { setErr(e.message) }
  }
  const statusChip = (s: number) => s === 0 ? <Chip size="small" color="success" label={t('marketStatusOn')} />
    : s === 2 ? <Chip size="small" color="error" label={t('marketStatusAdmin')} /> : <Chip size="small" label={t('marketStatusOff')} />
  return (
    <>
      <Button variant="contained" onClick={() => setEditing('new')} sx={{ mb: 2 }}>{t('marketList')}</Button>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      <Status loading={loading} error={error} />
      {data && data.length === 0 && <Typography color="text.secondary">{t('marketNoMine')}</Typography>}
      <Stack spacing={1.5}>
        {data?.map((i) => (
          <Card key={i.id}>
            <Stack direction="row" spacing={2} sx={{ p: 1.5, alignItems: 'center' }}>
              <Box sx={{ width: 64, height: 64, flexShrink: 0, borderRadius: 1, overflow: 'hidden' }}><Cover name={i.name} image={i.image ?? undefined} /></Box>
              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}>
                  <Typography sx={{ fontWeight: 600, wordBreak: 'break-word' }}>{i.name}</Typography>{statusChip(i.status)}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {i.score} {t('score')} · {i.unlimited ? t('marketUnlimited') : t('exchangeStock', String(i.stock))} · {t('marketSoldCount', String(i.sold))}
                </Typography>
              </Box>
            </Stack>
            {i.status !== 2 && (
              <CardActions sx={{ px: 1.5, pb: 1.5, pt: 0 }}>
                <Button size="small" onClick={() => setEditing(i)}>{t('edit')}</Button>
                <Button size="small" onClick={() => toggle(i)}>{i.status === 0 ? t('marketOff') : t('marketOn')}</Button>
              </CardActions>
            )}
          </Card>
        ))}
      </Stack>
      {editing && <ItemDialog item={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh() }} />}
    </>
  )
}

// 上传一个文件（图片 / 视频），返回地址
function useUpload() {
  const site = useSite()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const upload = async (file: File | undefined, type: 'topic' | 'video'): Promise<string | null> => {
    if (!file) return null
    setErr('')
    setBusy(true)
    try {
      const limit = Number(type === 'video' ? site.uploadVideoSizeLimit : site.uploadImageSizeLimit) || undefined
      const [url] = await uploadFiles([file], type, limit)
      return url
    } catch (e: any) { setErr(e.message); return null } finally { setBusy(false) }
  }
  return { upload, busy, err, setErr }
}

function ItemDialog({ item, onClose, onSaved }: { item: Item | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n()
  const [name, setName] = useState(item?.name ?? '')
  const [score, setScore] = useState(item ? String(item.score) : '')
  const [unlimited, setUnlimited] = useState(item ? item.unlimited : true)
  const [stock, setStock] = useState(item && !item.unlimited ? String(item.stock) : '1')
  const [description, setDescription] = useState(item?.description ?? '')
  const [image, setImage] = useState<string | null>(item?.image ?? null)
  const [text, setText] = useState(item?.reward?.text ?? '')
  const [file, setFile] = useState<{ url: string; type: 'image' | 'video' } | null>(
    item?.reward?.url && item.reward.type ? { url: item.reward.url, type: item.reward.type } : null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const cover = useUpload()
  const content = useUpload()

  const save = async () => {
    setErr('')
    setSaving(true)
    try {
      const body: Record<string, any> = {
        name, score, description, stock: unlimited ? -1 : stock, rewardText: text,
        removeImage: !image, removeRewardFile: !file,
      }
      if (item) body.id = item.id
      if (image && image !== item?.image) body.image = image
      if (file && file.url !== item?.reward?.url) { body.rewardUrl = file.url; body.rewardType = file.type }
      // 后端按表单参数接收（不是 JSON）
      const form = new FormData()
      Object.entries(body).forEach(([k, v]) => form.append(k, String(v)))
      await api.post('/api/market/item', form)
      onSaved()
    } catch (e: any) { setErr(e.message) } finally { setSaving(false) }
  }

  return (
    <Dialog open onClose={() => !saving && onClose()} fullWidth maxWidth="sm">
      <DialogTitle>{item ? t('marketEdit') : t('marketList')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField label={t('marketName')} value={name} onChange={(e) => setName(e.target.value)} slotProps={{ htmlInput: { maxLength: 100 } }} required />
          <TextField label={t('marketPrice')} value={score} onChange={(e) => setScore(e.target.value.replace(/\D/g, ''))} slotProps={{ htmlInput: { inputMode: 'numeric' } }} required />
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <FormControlLabel control={<Checkbox checked={unlimited} onChange={(e) => setUnlimited(e.target.checked)} />} label={t('marketUnlimited')} />
            {!unlimited && <TextField size="small" label={t('marketStock')} value={stock} onChange={(e) => setStock(e.target.value.replace(/\D/g, ''))} slotProps={{ htmlInput: { inputMode: 'numeric' } }} />}
          </Stack>
          <TextField label={t('marketDesc')} value={description} onChange={(e) => setDescription(e.target.value)} multiline minRows={2} slotProps={{ htmlInput: { maxLength: 500 } }} />

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{t('marketCover')}</Typography>
            {image && <Box component="img" src={image} alt="" sx={{ maxWidth: 160, maxHeight: 120, display: 'block', mb: 1, borderRadius: 1 }} />}
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Button component="label" size="small" variant="outlined" disabled={cover.busy}>{t('marketUploadImage')}
                <input hidden type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; const u = await cover.upload(f, 'topic'); if (u) setImage(u) }} />
              </Button>
              {image && <Button size="small" onClick={() => setImage(null)}>{t('marketRemoveFile')}</Button>}
              {cover.busy && <CircularProgress size={18} />}
            </Stack>
            {cover.err && <Alert severity="error" sx={{ mt: 1 }} onClose={() => cover.setErr('')}>{cover.err}</Alert>}
          </Box>

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{t('marketContent')}</Typography>
            <TextField label={t('marketContentText')} value={text} onChange={(e) => setText(e.target.value)} multiline minRows={3} fullWidth slotProps={{ htmlInput: { maxLength: 5000 } }} />
            {file && (
              <Box sx={{ mt: 1 }}>
                {file.type === 'video'
                  ? <Box component="video" src={file.url} controls sx={{ maxWidth: '100%', maxHeight: 200 }} />
                  : <Box component="img" src={file.url} alt="" sx={{ maxWidth: '100%', maxHeight: 200, display: 'block' }} />}
              </Box>
            )}
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 1, flexWrap: 'wrap', rowGap: 1 }}>
              <Button component="label" size="small" variant="outlined" disabled={content.busy}>{t('marketUploadImage')}
                <input hidden type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; const u = await content.upload(f, 'topic'); if (u) setFile({ url: u, type: 'image' }) }} />
              </Button>
              <Button component="label" size="small" variant="outlined" disabled={content.busy}>{t('marketUploadVideo')}
                <input hidden type="file" accept="video/mp4" onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; const u = await content.upload(f, 'video'); if (u) setFile({ url: u, type: 'video' }) }} />
              </Button>
              {file && <Button size="small" onClick={() => setFile(null)}>{t('marketRemoveFile')}</Button>}
              {content.busy && <CircularProgress size={18} />}
            </Stack>
            {content.err && <Alert severity="error" sx={{ mt: 1 }} onClose={() => content.setErr('')}>{content.err}</Alert>}
          </Box>
          {err && <Alert severity="error">{err}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>{t('cancel')}</Button>
        <Button variant="contained" onClick={save} disabled={saving || cover.busy || content.busy || !name.trim() || !score}>{t('save')}</Button>
      </DialogActions>
    </Dialog>
  )
}
