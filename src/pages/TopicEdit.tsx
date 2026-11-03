import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Alert, Autocomplete, Box, Button, Paper, Stack, TextField } from '@mui/material'
import { api, Tag, uploadFiles } from '../api'
import { useI18n } from '../i18n'
import { Markdown, Title } from '../components'

interface F { title: string; content: string }

export default function TopicEdit() {
  const { t } = useI18n()
  const { id } = useParams()
  const [sp] = useSearchParams()
  const editing = !!id
  const nav = useNavigate()
  const { register, handleSubmit, reset, watch, setValue, getValues, formState: { errors, isSubmitting } } = useForm<F>({ defaultValues: { title: '', content: '' } })
  const [tags, setTags] = useState<string[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [err, setErr] = useState('')

  useEffect(() => {
    const preset = sp.get('tag')
    if (!id && preset) setTags([preset])
    api.get<{ records: Tag[] }>('/api/tags').then((p) => setAllTags(p.records.map((t) => t.name))).catch(() => {})
    if (id) {
      api.get<{ topic: { title: string; content: string }; tags: Tag[] }>(`/api/topic/${id}`)
        .then((d) => { reset({ title: d.topic.title, content: d.topic.content }); setTags(d.tags.map((t) => t.name)) })
        .catch((e) => setErr(e.message))
    }
  }, [id, reset])

  // 上传后把 markdown / video 标签插到内容末尾
  const insertUpload = async (file: File | undefined, type: 'topic' | 'video') => {
    if (!file) return
    setErr('')
    try {
      const [url] = await uploadFiles([file], type)
      const snippet = type === 'video' ? `<video controls src="${url}"></video>` : `![](${url})`
      setValue('content', `${getValues('content')}\n${snippet}\n`)
    } catch (e: any) { setErr(e.message) }
  }

  const onSubmit = handleSubmit(async (v) => {
    setErr('')
    try {
      const body = editing ? v : { ...v, tag: tags.join(',') }
      const t = editing ? await api.put<{ id: number }>(`/api/topic/${id}`, body) : await api.post<{ id: number }>('/api/topic', body)
      nav(`/topic/${t.id}`)
    } catch (e: any) { setErr(e.message) }
  })

  return (
    <Paper sx={{ p: 3 }}>
      <Title>{editing ? t('edit') : t('publish')}</Title>
      <Box component="form" onSubmit={onSubmit}>
        <Stack spacing={2}>
          {err && <Alert severity="error">{err}</Alert>}
          <TextField label={t('title')} {...register('title', { required: '请输入标题' })} error={!!errors.title} helperText={errors.title?.message} />
          <TextField label={t('content')} multiline minRows={10} {...register('content')} />
          <Stack direction="row" spacing={1}>
            <Button component="label" size="small" variant="outlined">{t('uploadImage')}
              <input hidden type="file" accept="image/*" onChange={(e) => { insertUpload(e.target.files?.[0], 'topic'); e.target.value = '' }} />
            </Button>
            <Button component="label" size="small" variant="outlined">{t('uploadVideo')}
              <input hidden type="file" accept="video/mp4" onChange={(e) => { insertUpload(e.target.files?.[0], 'video'); e.target.value = '' }} />
            </Button>
          </Stack>
          {!editing && (
            <Autocomplete multiple freeSolo options={allTags} value={tags}
              onChange={(_, v) => setTags(v.slice(0, 5))}
              renderInput={(p) => <TextField {...p} label={t('tagsHint')} />} />
          )}
          {watch('content') && <Paper variant="outlined" sx={{ p: 2 }}><Markdown text={watch('content')} /></Paper>}
          <Button type="submit" variant="contained" disabled={isSubmitting}>{editing ? t('save') : t('publish')}</Button>
        </Stack>
      </Box>
    </Paper>
  )
}
