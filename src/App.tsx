import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './Layout'
import { useAuth } from './auth'
import Home from './pages/Home'
import TagTopics from './pages/TagTopics'
import Tags from './pages/Tags'
import TopicDetail from './pages/TopicDetail'
import TopicEdit from './pages/TopicEdit'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import Notifications from './pages/Notifications'
import Search from './pages/Search'
import Top100 from './pages/Top100'
import Exchange from './pages/Exchange'
import Settings from './pages/Settings'
import OAuthLogin from './pages/OAuthLogin'
import NotFound from './pages/NotFound'
import UserList from './pages/UserList'
import { Active, ChangeLanguage, CommentEdit, Logout } from './pages/Misc'

// /index、/index.html 跳到 /，保留 ?tab=&pageNo=
function IndexAlias() {
  const { search } = useLocation()
  return <Navigate to={{ pathname: '/', search }} replace />
}

// 用户端内容必须登录后才能查看：未登录统一跳到 /login，登录后回到原来的地址
function RequireAuth() {
  const { user } = useAuth()
  const location = useLocation()
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* 不需要登录：登录、注册、邮箱激活、第三方登录回调、退出、切换语言 */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/active" element={<Active />} />
        <Route path="/oauth-login" element={<OAuthLogin />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="/changeLanguage" element={<ChangeLanguage />} />
        {/* 其余内容都要先登录 */}
        <Route element={<RequireAuth />}>
          <Route path="/" element={<Home />} />
          <Route path="/tags" element={<Tags />} />
          <Route path="/topic/tag/:name" element={<TagTopics />} />
          <Route path="/topic/create" element={<TopicEdit />} />
          <Route path="/topic/edit/:id" element={<TopicEdit />} />
          <Route path="/topic/:id" element={<TopicDetail />} />
          <Route path="/comment/edit/:id" element={<CommentEdit />} />
          <Route path="/user/:username" element={<Profile />} />
          <Route path="/user/:username/:tab" element={<UserList />} />
          <Route path="/index" element={<IndexAlias />} />
          <Route path="/index.html" element={<IndexAlias />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/search" element={<Search />} />
          <Route path="/top100" element={<Top100 />} />
          <Route path="/exchange" element={<Exchange />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  )
}
