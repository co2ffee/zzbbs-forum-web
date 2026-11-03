import { Link as RouterLink } from 'react-router-dom'
import { Box, Button, Typography } from '@mui/material'
import { useI18n } from '../i18n'

// 没有匹配到任何前端路由时显示（原来是直接回到首页，用户分不清是不是链接错了）
export default function NotFound() {
  const { t } = useI18n()
  return (
    <Box sx={{ textAlign: 'center', py: 8 }}>
      <Typography variant="h3" color="text.secondary">404</Typography>
      <Typography sx={{ my: 2 }}>{t('notFound')}</Typography>
      <Button variant="contained" component={RouterLink} to="/">{t('backHome')}</Button>
    </Box>
  )
}
