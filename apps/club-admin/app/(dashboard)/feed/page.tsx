'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import { Megaphone, Trash2, Image as ImageIcon, Send, Trophy, Bell, Settings } from 'lucide-react'

type ClubPost = {
  id: string
  title: string
  content: string
  post_type: 'announcement' | 'fixture' | 'notice' | 'result'
  image_url: string | null
  created_at: string
}

export default function ClubFeedPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState<ClubPost[]>([])
  const [clubId, setClubId] = useState<string | null>(null)
  
  const [isCreating, setIsCreating] = useState(false)
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    post_type: 'announcement' as 'announcement' | 'fixture' | 'notice' | 'result'
  })

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: admin } = await supabase
          .from('club_admins')
          .select('club_id')
          .eq('user_id', user.id)
          .single()
        
        if (admin?.club_id) {
          setClubId(admin.club_id)
          fetchPosts(admin.club_id)
        } else {
          setLoading(false)
        }
      }
    }
    loadData()
  }, [])

  const fetchPosts = async (cId: string) => {
    setLoading(true)
    const { data } = await supabase
      .from('club_posts')
      .select('id, title, content, post_type, image_url, created_at')
      .eq('club_id', cId)
      .order('created_at', { ascending: false })

    if (data) {
      setPosts(data as ClubPost[])
    }
    setLoading(false)
  }

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clubId || !newPost.title || !newPost.content) return

    setIsCreating(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const { data, error } = await supabase
        .from('club_posts')
        .insert({
          club_id: clubId,
          author_id: user.id,
          title: newPost.title,
          content: newPost.content,
          post_type: newPost.post_type,
        })
        .select()
        .single()
        
      if (!error && data) {
        setPosts([data as ClubPost, ...posts])
        setNewPost({ title: '', content: '', post_type: 'announcement' })
      }
    }
    setIsCreating(false)
  }

  const handleDelete = async (id: string) => {
    setPosts(prev => prev.filter(p => p.id !== id))
    await supabase.from('club_posts').delete().eq('id', id)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'announcement': return <Megaphone size={18} className="text-orange-500" />
      case 'fixture': return <Trophy size={18} className="text-blue-500" />
      case 'result': return <Trophy size={18} className="text-purple-500" />
      case 'notice': return <Bell size={18} className="text-green-500" />
      default: return <Bell size={18} />
    }
  }

  return (
    <div className="portal-content max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Club Feed</h1>
          <p className="text-sm mt-1 text-muted-foreground">
            Publish announcements, notices, and results to your members
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create Post Form */}
        <div className="lg:col-span-1">
          <div className="card sticky top-6">
            <h2 className="text-lg font-bold mb-4 text-foreground">Create Post</h2>
            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-foreground block mb-1">Post Type</label>
                <select 
                  className="w-full bg-background border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  value={newPost.post_type}
                  onChange={e => setNewPost({...newPost, post_type: e.target.value as any})}
                >
                  <option value="announcement">Announcement</option>
                  <option value="notice">Notice</option>
                  <option value="fixture">Competition Fixture</option>
                  <option value="result">Competition Result</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-semibold text-foreground block mb-1">Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. Course Maintenance Update"
                  className="w-full bg-background border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  value={newPost.title}
                  onChange={e => setNewPost({...newPost, title: e.target.value})}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground block mb-1">Content</label>
                <textarea 
                  rows={4}
                  placeholder="Type your message here..."
                  className="w-full bg-background border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary resize-none"
                  value={newPost.content}
                  onChange={e => setNewPost({...newPost, content: e.target.value})}
                  required
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={isCreating}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 py-2.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                >
                  <Send size={16} />
                  {isCreating ? 'Publishing...' : 'Publish Post'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Posts Feed */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <TableSkeleton />
          ) : posts.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Megaphone size={24} className="text-muted-foreground" />
              </div>
              <h3 className="font-bold text-foreground">No posts yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first post to keep members informed.
              </p>
            </div>
          ) : (
            posts.map(post => (
              <div key={post.id} className="card hover:border-primary/20 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      {getTypeIcon(post.post_type)}
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">{post.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                        <span className="capitalize">{post.post_type}</span>
                        <span>•</span>
                        <span>{new Date(post.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(post.id)}
                    className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
