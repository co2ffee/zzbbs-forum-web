import { createContext, ReactNode, useContext, useState } from 'react'

// 轻量中英文切换（对应旧前台的 changeLanguage）
const dict = {
  zh: {
    checkin: '每日签到', checkinBtn: '签到', checkedInBtn: '今日已签到', checkinRange: '每天随机获得 {0}~{1} 积分', checkinFixed: '每天获得 {0} 积分',
    checkinGot: '签到成功，获得 {0} 积分', checkinToday: '今天获得 {0} 积分', checkinStreak: '连续签到 {0} 天',
    tags: '标签', topTen: '积分榜', publish: '发布话题', login: '登录', register: '注册', logout: '退出登录',
    profile: '个人主页', settings: '个人设置', notifications: '通知', search: '搜索', searchPlaceholder: '搜索话题',
    all: '全部', good: '精华', newest: '最新', hot: '热门', noanswer: '无人问津',
    username: '用户名', password: '密码', email: '邮箱', invite: '邀请码', captcha: '验证码',
    mobile: '手机号', smsCode: '短信验证码', sendCode: '发送验证码', mobileLogin: '手机号登录', passwordLogin: '账号密码登录',
    noAccount: '没有账号？去注册', hasAccount: '已有账号？去登录', socialLogin: '通过 {0} 登录/注册',
    comments: '评论', views: '浏览', top: '置顶', essence: '精华', empty: '暂无内容',
    like: '赞', collect: '收藏', uncollect: '取消收藏', edit: '编辑', delete: '删除', reply: '回复', save: '保存', cancel: '取消',
    submitComment: '发表评论', loginToComment: '请登录后评论', commentPlaceholder: '写下你的评论（支持 Markdown）',
    otherTopics: '作者的其他话题', topics: '话题', collects: '收藏', score: '积分', rank: '排名',
    searchResult: '搜索结果', activated: '帐号激活成功', notActive: '你的帐号还没有激活',
    sendActiveEmail: '发送激活邮件', bio: '个人简介', website: '个人网站', emailNotify: '接收邮件通知',
    saved: '已保存', uploadAvatar: '上传头像', bindEmail: '绑定/修改邮箱', newEmail: '新邮箱', emailCode: '邮箱验证码',
    updatePassword: '修改密码', oldPassword: '旧密码', newPassword: '新密码', token: '我的 Token', refreshToken: '刷新 Token',
    unread: '未读', read: '已读', title: '标题', content: '内容（Markdown）', tagsHint: '标签（最多 5 个）',
    uploadImage: '上传图片', uploadVideo: '上传视频', language: 'English',
    notifyComment: '{0} 评论了你的话题 {1}', notifyReply: '{0} 回复了你在话题 {1} 中的评论',
    notifyCollect: '{0} 收藏了你的话题 {1}', notifyOther: '{0} 与你的话题 {1} 有新动态', menu: '菜单', notFound: '页面不存在', backHome: '返回首页',
  },
  en: {
    checkin: 'Daily check-in', checkinBtn: 'Check in', checkedInBtn: 'Checked in today', checkinRange: 'Earn {0}-{1} points at random every day', checkinFixed: 'Earn {0} points every day',
    checkinGot: 'Checked in! +{0} points', checkinToday: 'Earned {0} points today', checkinStreak: '{0}-day streak',
    tags: 'Tags', topTen: 'Top 100', publish: 'New topic', login: 'Log in', register: 'Sign up', logout: 'Log out',
    profile: 'Profile', settings: 'Settings', notifications: 'Notifications', search: 'Search', searchPlaceholder: 'Search topics',
    all: 'All', good: 'Featured', newest: 'Newest', hot: 'Hot', noanswer: 'Unanswered',
    username: 'Username', password: 'Password', email: 'Email', invite: 'Invite code', captcha: 'Captcha',
    mobile: 'Mobile', smsCode: 'SMS code', sendCode: 'Send code', mobileLogin: 'Log in with mobile', passwordLogin: 'Log in with password',
    noAccount: 'No account? Sign up', hasAccount: 'Have an account? Log in', socialLogin: 'Continue with {0}',
    comments: 'Comments', views: 'views', top: 'Pinned', essence: 'Featured', empty: 'Nothing here yet',
    like: 'Like', collect: 'Collect', uncollect: 'Uncollect', edit: 'Edit', delete: 'Delete', reply: 'Reply', save: 'Save', cancel: 'Cancel',
    submitComment: 'Post comment', loginToComment: 'Log in to comment', commentPlaceholder: 'Write a comment (Markdown supported)',
    otherTopics: "Author's other topics", topics: 'Topics', collects: 'Collects', score: 'Score', rank: 'Rank',
    searchResult: 'Search results', activated: 'Account activated', notActive: 'Your account is not activated yet',
    sendActiveEmail: 'Send activation email', bio: 'Bio', website: 'Website', emailNotify: 'Email notifications',
    saved: 'Saved', uploadAvatar: 'Upload avatar', bindEmail: 'Bind / change email', newEmail: 'New email', emailCode: 'Email code',
    updatePassword: 'Change password', oldPassword: 'Old password', newPassword: 'New password', token: 'My token', refreshToken: 'Refresh token',
    unread: 'Unread', read: 'Read', title: 'Title', content: 'Content (Markdown)', tagsHint: 'Tags (up to 5)',
    uploadImage: 'Upload image', uploadVideo: 'Upload video', language: '中文',
    notifyComment: '{0} commented on your topic {1}', notifyReply: '{0} replied to your comment in {1}',
    notifyCollect: '{0} collected your topic {1}', notifyOther: '{0} has new activity on your topic {1}', menu: 'Menu', notFound: 'Page not found', backHome: 'Back to home',
  },
} as const

export type Key = keyof typeof dict.zh
type Lang = 'zh' | 'en'
interface Ctx { lang: Lang; setLang: (l: Lang) => void; t: (k: Key, ...args: string[]) => string }
const I18n = createContext<Ctx>(null as any)
export const useI18n = () => useContext(I18n)

const LANG_KEY = 'zzbbs_lang'
export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try { return (localStorage.getItem(LANG_KEY) as Lang) || 'zh' } catch { return 'zh' }
  })
  const setLang = (l: Lang) => { setLangState(l); try { localStorage.setItem(LANG_KEY, l) } catch { /* ignore */ } }
  const t = (k: Key, ...args: string[]) => args.reduce((s: string, a, i) => s.replace(`{${i}}`, a), dict[lang][k] as string)
  return <I18n.Provider value={{ lang, setLang, t }}>{children}</I18n.Provider>
}
