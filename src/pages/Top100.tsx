import { Navigate } from 'react-router-dom'
import { useMediaQuery, useTheme } from '@mui/material'
import { useI18n } from '../i18n'
import { ScoreBoard, Title } from '../components'

// 电脑端积分榜在首页话题列表右边，老链接 /top100 直接回首页；窄屏（手机/平板竖屏）还是这个单独页面
export default function Top100() {
  const { t } = useI18n()
  const wide = useMediaQuery(useTheme().breakpoints.up('md'))
  if (wide) return <Navigate to="/" replace />
  return (
    <>
      <Title>{t('topTen')}</Title>
      <ScoreBoard />
    </>
  )
}
