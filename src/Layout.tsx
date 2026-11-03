import { FormEvent, useState } from 'react'
import { Link as RouterLink, Outlet, useNavigate } from 'react-router-dom'
import {
  AppBar, Avatar, Badge, Box, Button, Container, IconButton, InputBase, Menu, MenuItem, Toolbar, Typography,
} from '@mui/material'
import NotificationsIcon from '@mui/icons-material/Notifications'
import SearchIcon from '@mui/icons-material/Search'
import { useAuth } from './auth'
import { useI18n } from './i18n'
import { useSite } from './site'

export default function Layout() {
  const { user, notRead, logout } = useAuth()
  const { t, lang, setLang } = useI18n()
  const site = useSite()
  const nav = useNavigate()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [kw, setKw] = useState('')

  const onSearch = (e: FormEvent) => {
    e.preventDefault()
    if (kw.trim()) nav(`/search?keyword=${encodeURIComponent(kw.trim())}`)
  }

  return (
    <>
      <AppBar position="sticky" elevation={1}>
        <Toolbar sx={{ gap: 1 }}>
          <Typography variant="h6" component={RouterLink} to="/" sx={{ color: 'inherit', textDecoration: 'none', mr: 2 }}>
            {site.name || 'ZZBBS'}
          </Typography>
          <Button color="inherit" component={RouterLink} to="/tags">{t('tags')}</Button>
          <Button color="inherit" component={RouterLink} to="/top100" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>{t('topTen')}</Button>
          <Box component="form" onSubmit={onSearch} sx={{ display: 'flex', alignItems: 'center', bgcolor: 'rgba(255,255,255,.18)', borderRadius: 1, px: 1, ml: 1 }}>
            <SearchIcon fontSize="small" />
            <InputBase value={kw} onChange={(e) => setKw(e.target.value)} placeholder={t('searchPlaceholder')} sx={{ color: 'inherit', ml: 1, width: { xs: 100, sm: 180 } }} />
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <Button color="inherit" size="small" onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}>{t('language')}</Button>
          {user ? (
            <>
              <Button color="inherit" component={RouterLink} to="/topic/create">{t('publish')}</Button>
              <IconButton color="inherit" onClick={() => nav('/notifications')}>
                <Badge badgeContent={notRead} color="error"><NotificationsIcon /></Badge>
              </IconButton>
              <IconButton onClick={(e) => setAnchor(e.currentTarget)}>
                <Avatar src={user.avatar} sx={{ width: 32, height: 32 }}>{user.username[0]}</Avatar>
              </IconButton>
              <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
                <MenuItem onClick={() => { setAnchor(null); nav(`/user/${user.username}`) }}>{t('profile')}</MenuItem>
                <MenuItem onClick={() => { setAnchor(null); nav('/settings') }}>{t('settings')}</MenuItem>
                <MenuItem onClick={() => { setAnchor(null); logout(); nav('/') }}>{t('logout')}</MenuItem>
              </Menu>
            </>
          ) : (
            <>
              <Button color="inherit" component={RouterLink} to="/login">{t('login')}</Button>
              <Button color="inherit" component={RouterLink} to="/register">{t('register')}</Button>
            </>
          )}
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Outlet />
      </Container>
    </>
  )
}
