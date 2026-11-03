import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Box, CircularProgress } from '@mui/material'
import { api, User } from '../api'
import { useAuth } from '../auth'

// 第三方登录回调后落在这里：后端已经把登录态写进 session，这里换取 token 完成前端登录
export default function OAuthLogin() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [err, setErr] = useState('')
  useEffect(() => {
    api.get<{ user: User; token: string }>('/api/oauth/session')
      .then((r) => { login(r.user, r.token); nav('/', { replace: true }) })
      .catch((e) => setErr(e.message))
  }, []) // eslint-disable-line
  return err ? <Alert severity="error">{err}</Alert> : <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>
}
