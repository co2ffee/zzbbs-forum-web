import { FormEvent, useState } from 'react'
import { Link as RouterLink, Outlet, useNavigate } from 'react-router-dom'
import {
  AppBar, Avatar, Badge, Box, Button, Container, Divider, IconButton, InputBase, Menu, MenuItem, Toolbar, Typography,
  useMediaQuery, useTheme,
} from '@mui/material'
import NotificationsIcon from '@mui/icons-material/Notifications'
import SearchIcon from '@mui/icons-material/Search'
import MenuIcon from '@mui/icons-material/Menu'
import { useAuth } from './auth'
import { useI18n } from './i18n'
import { useSite } from './site'

export default function Layout() {
  const { user, notRead, logout } = useAuth()
  const { t, lang, setLang } = useI18n()
  const site = useSite()
  const nav = useNavigate()
  const theme = useTheme()
  const mobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const [kw, setKw] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)

  const onSearch = (e: FormEvent) => {
    e.preventDefault()
    if (kw.trim()) {
      nav(`/search?keyword=${encodeURIComponent(kw.trim())}`)
      setSearchOpen(false)
    }
  }
  const go = (path: string) => { setAnchor(null); setMenuAnchor(null); nav(path) }

  const searchBox = (width: number | string) => (
    <Box component="form" onSubmit={onSearch} sx={{ display: 'flex', alignItems: 'center', bgcolor: 'rgba(255,255,255,.18)', borderRadius: 1, px: 1, ml: mobile ? 0 : 1, flex: mobile ? 1 : undefined }}>
      <SearchIcon fontSize="small" />
      <InputBase autoFocus={mobile} value={kw} onChange={(e) => setKw(e.target.value)} placeholder={t('searchPlaceholder')}
        sx={{ color: 'inherit', ml: 1, width, flex: mobile ? 1 : undefined }} />
    </Box>
  )

  return (
    <>
      <AppBar position="sticky" elevation={1}>
        <Toolbar sx={{ gap: 1, minHeight: { xs: 52, sm: 64 }, px: { xs: 1, sm: 2 } }}>
          {/* Logo 不换行；窄屏时字号小一点 */}
          <Typography variant="h6" component={RouterLink} to="/"
            sx={{ color: 'inherit', textDecoration: 'none', mr: { xs: 0, sm: 2 }, whiteSpace: 'nowrap', fontSize: { xs: '1.05rem', sm: '1.25rem' }, flexShrink: 0 }}>
            {site.name || 'ZZBBS'}
          </Typography>

          {mobile ? (
            <>
              <Box sx={{ flexGrow: 1 }} />
              {user && <IconButton color="inherit" size="small" onClick={() => setSearchOpen((v) => !v)} aria-label={t('search')}><SearchIcon /></IconButton>}
              {user && (
                <IconButton color="inherit" size="small" onClick={() => nav('/notifications')} aria-label={t('notifications')}>
                  <Badge badgeContent={notRead} color="error"><NotificationsIcon /></Badge>
                </IconButton>
              )}
              {user ? (
                <IconButton size="small" onClick={(e) => setAnchor(e.currentTarget)}>
                  <Avatar src={user.avatar} sx={{ width: 28, height: 28 }}>{user.username[0]}</Avatar>
                </IconButton>
              ) : (
                <IconButton color="inherit" size="small" onClick={(e) => setMenuAnchor(e.currentTarget)} aria-label={t('menu')}><MenuIcon /></IconButton>
              )}
            </>
          ) : (
            <>
              {/* 内容需登录后才能查看，未登录时不显示这些入口 */}
              {user && (
                <>
                  <Button color="inherit" component={RouterLink} to="/tags">{t('tags')}</Button>
                  <Button color="inherit" component={RouterLink} to="/top100">{t('topTen')}</Button>
                  {searchBox(180)}
                </>
              )}
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
                </>
              ) : (
                <>
                  <Button color="inherit" component={RouterLink} to="/login">{t('login')}</Button>
                  <Button color="inherit" component={RouterLink} to="/register">{t('register')}</Button>
                </>
              )}
            </>
          )}
        </Toolbar>
        {/* 窄屏：搜索框点图标后在下一行展开 */}
        {mobile && user && searchOpen && <Toolbar sx={{ minHeight: 48, px: 1 }}>{searchBox('100%')}</Toolbar>}
      </AppBar>

      {/* 登录用户的头像菜单；窄屏时把导航、发布、语言也收进来 */}
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {mobile && <MenuItem onClick={() => go('/topic/create')}>{t('publish')}</MenuItem>}
        {mobile && <MenuItem onClick={() => go('/tags')}>{t('tags')}</MenuItem>}
        {mobile && <MenuItem onClick={() => go('/top100')}>{t('topTen')}</MenuItem>}
        {mobile && <Divider />}
        {user && <MenuItem onClick={() => go(`/user/${user.username}`)}>{t('profile')}</MenuItem>}
        <MenuItem onClick={() => go('/settings')}>{t('settings')}</MenuItem>
        {mobile && <MenuItem onClick={() => { setAnchor(null); setLang(lang === 'zh' ? 'en' : 'zh') }}>{t('language')}</MenuItem>}
        <MenuItem onClick={() => { setAnchor(null); logout(); nav('/') }}>{t('logout')}</MenuItem>
      </Menu>

      {/* 未登录用户的窄屏菜单 */}
      <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => go('/login')}>{t('login')}</MenuItem>
        <MenuItem onClick={() => go('/register')}>{t('register')}</MenuItem>
        <Divider />
        <MenuItem onClick={() => { setMenuAnchor(null); setLang(lang === 'zh' ? 'en' : 'zh') }}>{t('language')}</MenuItem>
      </Menu>

      <Container maxWidth="md" sx={{ py: { xs: 2, sm: 3 }, px: { xs: 1.5, sm: 3 } }}>
        <Outlet />
      </Container>
    </>
  )
}
