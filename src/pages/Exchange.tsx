import { useEffect, useState } from 'react'
import {
  Alert, Box, Button, Card, CardActions, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Tab, Tabs,
  TextField, Typography,
} from '@mui/material'
import { api, fmtTime } from '../api'
import { useAuth } from '../auth'
import { useI18n } from '../i18n'
import { Status, Title, useAsync } from '../components'

interface Reward { text?: string | null; type?: 'image' | 'video' | null; url?: string | null }
interface Product { id: number; name: string; image?: string; description?: string; score: number; unlimited: boolean; stock: number; soldOut: boolean; delivers?: string[] }
interface ProductsData { products: Product[]; score: number }
interface Order { id: number; productName: string; productImage?: string; score: number; status: number; remark?: string; inTime: string; reward?: Reward | null }

function Cover({ name, image }: { name: string; image?: string }) {
  return image
    ? <Box component="img" src={image} alt={name} loading="lazy" sx={{ width: '100%', height: 160, objectFit: 'cover', display: 'block', bgcolor: 'action.hover' }} />
    : <Box sx={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover', color: 'text.secondary', fontSize: 48 }}>{name[0]}</Box>
}

// 兑换到的内容：文本（可复制）、图片、视频
function RewardView({ reward }: { reward: Reward }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(reward.text ?? ''); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* 复制失败（浏览器不允许）时用户可以手动选中复制 */ }
  }
  return (
    <Stack spacing={1.5}>
      {reward.text && (
        <Box>
          <Typography sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', bgcolor: 'action.hover', p: 1.5, borderRadius: 1, userSelect: 'text' }}>{reward.text}</Typography>
          <Button size="small" onClick={copy} sx={{ mt: 0.5 }}>{copied ? t('copied') : t('copy')}</Button>
        </Box>
      )}
      {reward.url && reward.type === 'video' && <Box component="video" src={reward.url} controls sx={{ width: '100%', maxHeight: '60vh', bgcolor: '#000' }} />}
      {reward.url && reward.type !== 'video' && (
        <Box component="a" href={reward.url} target="_blank" rel="noopener noreferrer">
          <Box component="img" src={reward.url} alt="" sx={{ maxWidth: '100%', maxHeight: '60vh', display: 'block' }} />
        </Box>
      )}
    </Stack>
  )
}

// 积分兑换：商品（名称、图片、所需积分）由后台配置
export default function Exchange() {
  const { t } = useI18n()
  const { updateUser } = useAuth()
  const [tab, setTab] = useState<'products' | 'orders'>('products')
  const [key, setKey] = useState(0)
  const { data, loading, error } = useAsync(() => api.get<ProductsData>('/api/exchange/products'), [key])
  const [score, setScore] = useState<number | null>(null)
  const [target, setTarget] = useState<Product | null>(null)
  const [got, setGot] = useState<{ name: string; reward: Reward } | null>(null) // 刚兑换到的内容
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => { if (data) setScore(data.score ?? 0) }, [data])
  // 积分第一次渲染时 score 状态还是 null（useEffect 在渲染之后才设置），直接用它判断会让按钮先闪一下“积分不足”；
  // 所以没设置过就先用接口返回的积分
  const myScore = score ?? data?.score ?? 0

  const open = (p: Product) => { setTarget(p); setMsg(null) }
  const doExchange = async () => {
    if (!target || busy) return
    setBusy(true)
    try {
      const r = await api.post<{ cost: number; totalScore: number; reward?: Reward | null }>(`/api/exchange/${target.id}`)
      setScore(r.totalScore)
      updateUser({ score: r.totalScore })
      setMsg({ ok: true, text: t('exchangeOk', String(r.cost)) })
      if (r.reward && (r.reward.text || r.reward.url)) setGot({ name: target.name, reward: r.reward })
      setTarget(null)
      setKey((k) => k + 1) // 刷新库存
    } catch (e: any) {
      setMsg({ ok: false, text: e.message })
      setTarget(null)
      setKey((k) => k + 1)
    } finally { setBusy(false) }
  }

  return (
    <>
      <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Title>{t('exchange')}</Title>
        {(score != null || data) && <Typography color="text.secondary" sx={{ mb: 2 }}>{t('myScore')}：<b>{myScore}</b></Typography>}
      </Stack>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="products" label={t('exchangeProducts')} />
        <Tab value="orders" label={t('myExchanges')} />
      </Tabs>
      {msg && <Alert severity={msg.ok ? 'success' : 'error'} sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}

      {tab === 'products' && (
        <>
          <Status loading={loading} error={error} />
          {data && data.products.length === 0 && <Typography color="text.secondary">{t('exchangeEmpty')}</Typography>}
          {data && (
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' } }}>
              {data.products.map((p) => {
                const enough = myScore >= p.score
                return (
                  <Card key={p.id} sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Cover name={p.name} image={p.image} />
                    <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>{p.name}</Typography>
                      {p.description && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, wordBreak: 'break-word' }}>{p.description}</Typography>}
                      <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}>
                        <Chip size="small" color="primary" variant="outlined" label={t('exchangeNeed', String(p.score))} />
                        {p.soldOut ? <Chip size="small" label={t('soldOut')} /> : !p.unlimited && <Typography variant="caption" color="text.secondary">{t('exchangeStock', String(p.stock))}</Typography>}
                      </Stack>
                      {!!p.delivers?.length && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                          {t('exchangeGets', p.delivers.map((d) => t(d === 'video' ? 'rewardVideo' : d === 'image' ? 'rewardImage' : 'rewardText')).join('、'))}
                        </Typography>
                      )}
                    </CardContent>
                    <CardActions sx={{ px: 2, pb: 2 }}>
                      <Button fullWidth variant="contained" disabled={p.soldOut || !enough} onClick={() => open(p)}>
                        {p.soldOut ? t('soldOut') : !enough ? t('notEnough') : t('exchangeBtn')}
                      </Button>
                    </CardActions>
                  </Card>
                )
              })}
            </Box>
          )}
        </>
      )}

      {tab === 'orders' && <MyOrders refreshKey={key} />}

      <Dialog open={!!got} onClose={() => setGot(null)} fullWidth maxWidth="sm">
        <DialogTitle>{t('exchangeDoneTitle')}{got ? `：${got.name}` : ''}</DialogTitle>
        <DialogContent>{got && <RewardView reward={got.reward} />}</DialogContent>
        <DialogActions><Button variant="contained" onClick={() => setGot(null)}>{t('confirm')}</Button></DialogActions>
      </Dialog>

      <Dialog open={!!target} onClose={() => !busy && setTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>{t('exchange')}</DialogTitle>
        <DialogContent>
          {target && <Typography>{t('exchangeConfirm', String(target.score), target.name)}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTarget(null)} disabled={busy}>{t('cancel')}</Button>
          <Button variant="contained" onClick={doExchange} disabled={busy}>{t('confirm')}</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

function MyOrders({ refreshKey }: { refreshKey: number }) {
  const { t } = useI18n()
  const { data, loading, error } = useAsync(() => api.get<Order[]>('/api/exchange/orders'), [refreshKey])
  const status = (s: number) => s === 1 ? <Chip size="small" color="success" label={t('orderDone')} />
    : s === 2 ? <Chip size="small" label={t('orderCanceled')} /> : <Chip size="small" color="warning" label={t('orderPending')} />
  return (
    <>
      <Status loading={loading} error={error} />
      {data && data.length === 0 && <Typography color="text.secondary">{t('exchangeNoOrders')}</Typography>}
      <Stack spacing={1.5}>
        {data?.map((o) => (
          <Card key={o.id}>
            <Stack direction="row" spacing={2} sx={{ p: 1.5, alignItems: 'center' }}>
              <Box sx={{ width: 64, height: 64, flexShrink: 0, borderRadius: 1, overflow: 'hidden' }}><Cover name={o.productName} image={o.productImage} /></Box>
              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}>
                  <Typography sx={{ fontWeight: 600, wordBreak: 'break-word' }}>{o.productName}</Typography>{status(o.status)}
                </Stack>
                <Typography variant="body2" color="text.secondary">{o.score} {t('score')} · {fmtTime(o.inTime)}</Typography>
                {o.remark && <Typography variant="body2">{t('remark')}：{o.remark}</Typography>}
              </Box>
            </Stack>
            {o.reward && (o.reward.text || o.reward.url) && <OrderReward reward={o.reward} />}
          </Card>
        ))}
      </Stack>
    </>
  )
}

// 我的兑换里点开查看兑换到的内容（取消的订单后端不再返回内容）
function OrderReward({ reward }: { reward: Reward }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  return (
    <Box sx={{ px: 1.5, pb: 1.5 }}>
      <Button size="small" onClick={() => setOpen((v) => !v)}>{open ? t('hideReward') : t('viewReward')}</Button>
      {open && <Box sx={{ mt: 1 }}><RewardView reward={reward} /></Box>}
    </Box>
  )
}
