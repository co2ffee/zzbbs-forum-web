import { Link as RouterLink } from 'react-router-dom'
import { Avatar, List, ListItem, ListItemAvatar, ListItemText, Paper, Typography } from '@mui/material'
import { api, User } from '../api'
import { useI18n } from '../i18n'
import { Status, Title, useAsync } from '../components'

export default function Top100() {
  const { t } = useI18n()
  const { data, loading, error } = useAsync(() => api.get<User[]>('/api/top100'), [])
  return (
    <>
      <Title>{t('topTen')}</Title>
      <Status loading={loading} error={error} />
      {data && (
        <Paper>
          <List disablePadding>
            {data.map((u, i) => (
              <ListItem key={u.id} divider component={RouterLink} to={`/user/${u.username}`} sx={{ color: 'inherit' }}
                secondaryAction={<Typography color="text.secondary">{t('score')} {u.score ?? 0}</Typography>}>
                <Typography sx={{ width: 36 }} color="text.secondary">{i + 1}</Typography>
                <ListItemAvatar><Avatar src={u.avatar}>{u.username[0]}</Avatar></ListItemAvatar>
                <ListItemText primary={u.username} />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </>
  )
}
