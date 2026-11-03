import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import { Alert, Box, Button, Divider, Link, Paper, Stack, Tab, Tabs, TextField } from '@mui/material'
import { api, User } from '../api'
import { useAuth } from '../auth'
import { useI18n } from '../i18n'
import { useSite } from '../site'
import { Captcha, Title } from '../components'

interface F { username: string; password: string; mobile: string; code: string; captcha: string }

export default function Login() {
  const { t } = useI18n()
  const site = useSite()
  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<F>()
  const { login } = useAuth()
  const nav = useNavigate()
  const location = useLocation()
  // 被路由守卫拦下时记着原来的地址，登录后回去
  const from = (location.state as { from?: { pathname: string; search?: string } } | null)?.from
  const [mode, setMode] = useState<'password' | 'mobile'>('password')
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')
  const [k, setK] = useState(0)

  const finish = (r: { user: User; token: string }) => { login(r.user, r.token); nav(from ? from.pathname + (from.search || '') : '/', { replace: true }) }

  const onSubmit = handleSubmit(async (v) => {
    setErr('')
    try {
      finish(mode === 'password'
        ? await api.post('/api/login', { username: v.username, password: v.password, captcha: v.captcha })
        : await api.post('/api/mobile_login', { mobile: v.mobile, code: v.code, captcha: v.captcha }))
    } catch (e: any) {
      setErr(e.message)
      setK((x) => x + 1)
    }
  })

  const sendCode = async () => {
    setErr(''); setInfo('')
    const { mobile, captcha } = getValues()
    try {
      await api.get(`/api/sms_code?mobile=${encodeURIComponent(mobile || '')}&captcha=${encodeURIComponent(captcha || '')}`)
      setInfo('OK')
    } catch (e: any) { setErr(e.message) }
  }

  return (
    <Paper sx={{ p: 3, maxWidth: 420, mx: 'auto' }}>
      <Title>{t('login')}</Title>
      {site.smsEnabled && (
        <Tabs value={mode} onChange={(_, v) => setMode(v)} sx={{ mb: 2 }}>
          <Tab value="password" label={t('passwordLogin')} /><Tab value="mobile" label={t('mobileLogin')} />
        </Tabs>
      )}
      <Box component="form" onSubmit={onSubmit}>
        <Stack spacing={2}>
          {err && <Alert severity="error">{err}</Alert>}
          {info && <Alert severity="success">{info}</Alert>}
          {mode === 'password' ? (
            <>
              <TextField label={t('username')} {...register('username', { required: true })} error={!!errors.username} />
              <TextField label={t('password')} type="password" {...register('password', { required: true })} error={!!errors.password} />
            </>
          ) : (
            <>
              <TextField label={t('mobile')} {...register('mobile', { required: true })} error={!!errors.mobile} />
              <Stack direction="row" spacing={2}>
                <TextField label={t('smsCode')} sx={{ flex: 1 }} {...register('code', { required: true })} error={!!errors.code} />
                <Button variant="outlined" onClick={sendCode}>{t('sendCode')}</Button>
              </Stack>
            </>
          )}
          <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
            <TextField label={t('captcha')} sx={{ flex: 1 }} {...register('captcha', { required: true })} error={!!errors.captcha} />
            <Captcha key={k} />
          </Stack>
          <Button type="submit" variant="contained" disabled={isSubmitting}>{t('login')}</Button>
          <Link component={RouterLink} to="/register" variant="body2">{t('noAccount')}</Link>
          {site.socials.length > 0 && <Divider />}
          {site.socials.map((s) => (
            // 第三方登录由后端完成授权，spa=1 让回调后回到前端的 /oauth-login
            <Button key={s} variant="outlined" href={`/oauth/redirect/${s}?spa=1`}>
              {t('socialLogin', s.charAt(0).toUpperCase() + s.slice(1))}
            </Button>
          ))}
        </Stack>
      </Box>
    </Paper>
  )
}
