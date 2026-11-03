import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
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
import Settings from './pages/Settings'
import OAuthLogin from './pages/OAuthLogin'
import UserList from './pages/UserList'
import { Active, ChangeLanguage, CommentEdit, Logout } from './pages/Misc'
import { ReactElement } from 'react'

// /index、/index.html 跳到 /，保留 ?tab=&pageNo=
function IndexAlias() {
  const { search } = useLocation()
  return <Navigate to={{ pathname: '/', search }} replace />
}

function RequireAuth({ children }: { children: ReactElement }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/tags" element={<Tags />} />
        <Route path="/topic/tag/:name" element={<TagTopics />} />
        <Route path="/topic/:id" element={<TopicDetail />} />
        <Route path="/topic/create" element={<RequireAuth><TopicEdit /></RequireAuth>} />
        <Route path="/topic/edit/:id" element={<RequireAuth><TopicEdit /></RequireAuth>} />
        <Route path="/comment/edit/:id" element={<RequireAuth><CommentEdit /></RequireAuth>} />
        <Route path="/user/:username" element={<Profile />} />
        <Route path="/user/:username/:tab" element={<UserList />} />
        <Route path="/index" element={<IndexAlias />} />
        <Route path="/index.html" element={<IndexAlias />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="/active" element={<Active />} />
        <Route path="/changeLanguage" element={<ChangeLanguage />} />
        <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
        <Route path="/search" element={<Search />} />
        <Route path="/top100" element={<Top100 />} />
        <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
        <Route path="/oauth-login" element={<OAuthLogin />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
