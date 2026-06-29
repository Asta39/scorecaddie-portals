'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Trash2, Megaphone, Calendar, Trophy, Plus, RefreshCw } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type ClubPost = {
  id: string
  title: string
  content: string
  post_type: string
  created_at: string
  author_id: string
}

export default function NewsFeedPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState<ClubPost[]>([])
  const [clubId, setClubId] = useState<string | null>(null)
  
  const [isCreating, setIsCreating] = useState(false)
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    post_type: 'announcement'
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: admin } = await supabase
        .from('club_admins')
        .select('club_id')
        .eq('user_id', user.id)
        .single()
      
      if (admin && admin.club_id) {
        setClubId(admin.club_id)
        fetchPosts(admin.club_id)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchPosts = async (cId: string) => {
    const { data } = await supabase
      .from('club_posts')
      .select('*')
      .eq('club_id', cId)
      .order('created_at', { ascending: false })
    
    if (data) setPosts(data)
  }

  const handleCreatePost = async () => {
    if (!clubId || !newPost.title || !newPost.content) return
    setIsCreating(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('club_posts')
        .insert({
          club_id: clubId,
          author_id: user.id,
          title: newPost.title,
          content: newPost.content,
          post_type: newPost.post_type
        })
      
      if (error) throw error

      setNewPost({ title: '', content: '', post_type: 'announcement' })
      fetchPosts(clubId)
    } catch (err) {
      console.error(err)
      alert('Failed to create post')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeletePost = async (id: string) => {
    if (!confirm('Delete this post?')) return
    
    const { error } = await supabase
      .from('club_posts')
      .delete()
      .eq('id', id)
    
    if (!error && clubId) {
      fetchPosts(clubId)
    }
  }

  const getPostIcon = (type: string) => {
    switch(type) {
      case 'announcement': return <Megaphone className="w-5 h-5 text-golfLime" />
      case 'fixture': return <Calendar className="w-5 h-5 text-blue-500" />
      case 'result': return <Trophy className="w-5 h-5 text-yellow-500" />
      default: return <Megaphone className="w-5 h-5" />
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Loading news feed...</div>
  }

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">News Feed</h1>
          <p className="text-muted-foreground">Manage announcements and posts for your club members.</p>
        </div>
        <Button onClick={() => fetchPosts(clubId!)} variant="outline" size="icon">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Create New Post</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3">
              <Input 
                placeholder="Post Title" 
                value={newPost.title}
                onChange={(e) => setNewPost({...newPost, title: e.target.value})}
              />
            </div>
            <div>
              <Select value={newPost.post_type} onValueChange={(val) => setNewPost({...newPost, post_type: val as string})}>
                <SelectTrigger>
                  <SelectValue placeholder="Post Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="announcement">Announcement</SelectItem>
                  <SelectItem value="fixture">Fixture Update</SelectItem>
                  <SelectItem value="result">Result Highlight</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Textarea 
            placeholder="Write the content of your post here..." 
            rows={4}
            value={newPost.content}
            onChange={(e) => setNewPost({...newPost, content: e.target.value})}
          />
          <div className="flex justify-end">
            <Button onClick={handleCreatePost} disabled={isCreating || !newPost.title || !newPost.content}>
              {isCreating ? 'Publishing...' : 'Publish Post'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium">No posts yet</h3>
            <p className="text-muted-foreground">Publish an announcement to engage your club members.</p>
          </div>
        ) : (
          posts.map(post => (
            <Card key={post.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  <div className="p-4 bg-muted/30 border-b md:border-b-0 md:border-r w-full md:w-48 flex md:flex-col items-center md:items-start justify-between md:justify-start gap-2">
                    <div className="flex items-center gap-2">
                      {getPostIcon(post.post_type)}
                      <span className="font-medium capitalize text-sm">{post.post_type}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(post.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="p-4 flex-1 flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg mb-1">{post.title}</h3>
                      <p className="text-muted-foreground whitespace-pre-wrap text-sm">{post.content}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50 -mt-2 -mr-2" onClick={() => handleDeletePost(post.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
