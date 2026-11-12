import { useEffect, useState } from 'react'
import {
  Alert, Box, Button, Card, CardActions, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Tab, Tabs,
  TextField, Typography,
} from '@mui/material'
import { api, fmtTime } from '../api'
import { useAuth } from '../auth'
import { useI18n } from '../i18n'
import { Status, Title, useAsync } from '../components'

interface Product { id: number; name: string; image?: string; description?: string; score: number; unlimited: boolean; stock: number; soldOut: boolean }
interface ProductsData { products: Product[]; score: number }
interface Order { id: number; productName: string; productImage?: string; score: number; contact?: string; status: number; remark?: string; inTime: string }

function Cover({ name, image }: { name: string; image?: string }) {
  return image
    ? <Box component="img" src={image} alt={name} loading="lazy" sx={{ width: '100%', height: 160, objectFit: 'cover', display: 'block', bgcolor: 'action.hover' }} />
    : <Box sx={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover', color: 'text.secondary', fontSize: 48 }}>{name[0]}</Box>
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
  const [contact, setContact] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => { if (data) setScore(data.score ?? 0) }, [data])

  const open = (p: Product) => { setTarget(p); setContact(''); setMsg(null) }
  const doExchange = async () => {
    if (!target || busy) return
    setBusy(true)
    try {
      const r = await api.post<{ cost: number; totalScore: number }>(`/api/exchange/${target.id}`, { contact })
      setScore(r.totalScore)
      updateUser({ score: r.totalScore })
      setMsg({ ok: true, text: t('exchangeOk', String(r.cost)) })
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
        {score != null && <Typography color="text.secondary" sx={{ mb: 2 }}>{t('myScore')}：<b>{score}</b></Typography>}
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
                const enough = (score ?? 0) >= p.score
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

      <Dialog open={!!target} onClose={() => !busy && setTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>{t('exchange')}</DialogTitle>
        <DialogContent>
          {target && <Typography sx={{ mb: 2 }}>{t('exchangeConfirm', String(target.score), target.name)}</Typography>}
          <TextField fullWidth multiline minRows={2} label={t('exchangeContact')} placeholder={t('exchangeContactHint')} value={contact}
            onChange={(e) => setContact(e.target.value)} slotProps={{ htmlInput: { maxLength: 500 } }} />
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
          </Card>
        ))}
      </Stack>
    </>
  )
}
