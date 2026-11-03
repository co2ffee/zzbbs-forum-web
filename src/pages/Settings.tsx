import { useEffect, useState } from 'react'
import { Alert, Avatar, Box, Button, Checkbox, Divider, FormControlLabel, Paper, Stack, TextField, Typography } from '@mui/material'
import { api, setToken, uploadFiles, User } from '../api'
import { useAuth } from '../auth'
import { useI18n } from '../i18n'
import { Status, Title, useAsync } from '../components'

type Me = User & { telegramName?: string; emailNotification?: boolean; mobile?: string }

export default function Settings() {
  const { t } = useI18n()
  const { updateUser } = useAuth()
  const { data, loading, error } = useAsync(() => api.get<Me>('/api/settings'), [])
  const [me, setMe] = useState<Me | null>(null)
  const [msg, setMsg] = useState<{ t: 'success' | 'error'; s: string } | null>(null)
  const [newEmail, setNewEmail] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [oldPassword, setOld] = useState('')
  const [newPassword, setNew] = useState('')
  const [token, setTokenText] = useState('')
  useEffect(() => { if (data) setMe(data) }, [data])

  const run = async (fn: () => Promise<unknown>, ok = t('saved')) => {
    try { await fn(); setMsg({ t: 'success', s: ok }) } catch (e: any) { setMsg({ t: 'error', s: e.message }) }
  }

  if (loading || error || !me) return <Status loading={loading} error={error} />

  return (
    <>
      <Title>{t('settings')}</Title>
      {msg && <Alert severity={msg.t} sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg.s}</Alert>}
      {!me.active && (
        <Alert severity="warning" sx={{ mb: 2 }} action={<Button size="small" onClick={() => run(() => api.get('/api/settings/sendActiveEmail'), 'OK')}>{t('sendActiveEmail')}</Button>}>
          {t('notActive')}
        </Alert>
      )}
      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Avatar src={me.avatar} sx={{ width: 64, height: 64 }}>{me.username[0]}</Avatar>
            <Button component="label" variant="outlined">{t('uploadAvatar')}
              <input hidden type="file" accept="image/*" onChange={(e) => {
                const f = e.target.files?.[0]; e.target.value = ''
                if (f) run(async () => { const [url] = await uploadFiles([f], 'avatar'); setMe({ ...me, avatar: url }); updateUser({ avatar: url }) })
              }} />
            </Button>
          </Stack>
          <TextField label={t('website')} value={me.website ?? ''} onChange={(e) => setMe({ ...me, website: e.target.value })} />
          <TextField label="Telegram" value={me.telegramName ?? ''} onChange={(e) => setMe({ ...me, telegramName: e.target.value })} />
          <TextField label={t('bio')} multiline minRows={3} value={me.bio ?? ''} onChange={(e) => setMe({ ...me, bio: e.target.value })} />
          <FormControlLabel control={<Checkbox checked={!!me.emailNotification} onChange={(e) => setMe({ ...me, emailNotification: e.target.checked })} />} label={t('emailNotify')} />
          <Button variant="contained" onClick={() => run(async () => {
            await api.put('/api/settings', { bio: me.bio ?? '', website: me.website ?? '', telegramName: me.telegramName ?? '', emailNotification: String(!!me.emailNotification) })
            updateUser({ bio: me.bio })
          })}>{t('save')}</Button>

          <Divider />
          <Typography variant="subtitle2">{t('bindEmail')}（{me.email || '-'}）</Typography>
          <Stack direction="row" spacing={2}>
            <TextField label={t('newEmail')} sx={{ flex: 1 }} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            <Button variant="outlined" onClick={() => run(() => api.get(`/api/settings/sendEmailCode?email=${encodeURIComponent(newEmail)}`), 'OK')}>{t('sendCode')}</Button>
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField label={t('emailCode')} sx={{ flex: 1 }} value={emailCode} onChange={(e) => setEmailCode(e.target.value)} />
            <Button variant="outlined" onClick={() => run(async () => { await api.put('/api/settings/updateEmail', { email: newEmail, code: emailCode }); setMe({ ...me, email: newEmail, active: true }); updateUser({ email: newEmail, active: true }) })}>{t('save')}</Button>
          </Stack>

          <Divider />
          <Typography variant="subtitle2">{t('updatePassword')}</Typography>
          <TextField label={t('oldPassword')} type="password" value={oldPassword} onChange={(e) => setOld(e.target.value)} />
          <TextField label={t('newPassword')} type="password" value={newPassword} onChange={(e) => setNew(e.target.value)} />
          <Button variant="outlined" onClick={() => run(async () => { await api.put('/api/settings/updatePassword', { oldPassword, newPassword }); setOld(''); setNew('') })}>{t('updatePassword')}</Button>

          <Divider />
          <Typography variant="subtitle2">{t('token')}</Typography>
          <Box sx={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>{token || '••••••••'}</Box>
          <Button variant="outlined" color="warning" onClick={() => run(async () => {
            const tk = await api.get<string>('/api/settings/refreshToken')
            setTokenText(tk)
            // 刷新后旧 token 失效，本地同步换成新的，避免被踢下线
            setToken(tk)
          }, 'OK')}>{t('refreshToken')}</Button>
        </Stack>
      </Paper>
    </>
  )
}
