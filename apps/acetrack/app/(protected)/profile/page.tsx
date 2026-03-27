'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/contexts/authContext'
import { supabase } from '@/lib/config/supabase'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  User, 
  Mail, 
  GraduationCap, 
  IdCard, 
  Calendar,
  Edit,
  Save,
  X
} from 'lucide-react'
import Image from 'next/image'

interface UserProfile {
  id: string
  student_id: string
  first_name: string
  middle_name: string | null
  last_name: string
  course_id: number
  year_level: string
  created_at: string
  course?: {
    course_name: string
  }
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    year_level: ''
  })

  useEffect(() => {
    if (user?.id) {
      fetchProfile()
    } else if (user === null) {
      setLoading(false)
    }
  }, [user?.id])

  const fetchProfile = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          course:courses(
            course_name
          )
        `)
        .eq('id', user?.id)
        .single()

      if (error) throw error

      setProfile(data)
      setEditForm({
        first_name: data.first_name,
        middle_name: data.middle_name || '',
        last_name: data.last_name,
        year_level: data.year_level
      })
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    setEditing(true)
  }

  const handleCancel = () => {
    setEditing(false)
    if (profile) {
      setEditForm({
        first_name: profile.first_name,
        middle_name: profile.middle_name || '',
        last_name: profile.last_name,
        year_level: profile.year_level
      })
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      const { error } = await supabase
        .from('user_profiles')
        .update({
          first_name: editForm.first_name,
          middle_name: editForm.middle_name || null,
          last_name: editForm.last_name,
          year_level: editForm.year_level
        })
        .eq('id', user?.id)

      if (error) throw error

      await fetchProfile()
      setEditing(false)
    } catch (error) {
      console.error('Error updating profile:', error)
    } finally {
      setSaving(false)
    }
  }

  const getInitials = () => {
    if (!profile) return 'U'
    return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading || !user) {
    return (
      <div className="space-y-6 pb-8">
        <div className="pt-5">
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Card className="p-6">
          <div className="flex flex-col items-center gap-4 mb-6">
            <Skeleton className="h-24 w-24 rounded-full" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </Card>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="space-y-6 pb-8">
        <div className="pt-5">
          <h1 className="text-2xl font-bold mb-1">Profile</h1>
          <p className="text-muted-foreground text-sm">
            Manage your account information
          </p>
        </div>
        <Card className="p-12 flex flex-col items-center justify-center text-center">
          <Image 
            src="/characters/not-found.png" 
            width={80} 
            height={80} 
            alt="No profile" 
            className="mb-4"
          />
          <p className="text-muted-foreground font-medium">Profile not found</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Unable to load your profile information
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="pt-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Profile</h1>
          <p className="text-muted-foreground text-sm">
            Manage your account information
          </p>
        </div>
        {!editing && (
          <Button onClick={handleEdit} variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </div>

      {/* Profile Card */}
      <Card className="p-6">
        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-4 mb-8 pb-6 border-b">
          <Avatar className="h-24 w-24 border-4 border-primary/20">
            <AvatarImage 
              src={user?.user_metadata?.avatar_url} 
              alt={`${profile.first_name} ${profile.last_name}`}
            />
            <AvatarFallback className="text-2xl font-bold">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="text-center">
            <h2 className="text-xl font-semibold">
              {profile.first_name} {profile.middle_name && `${profile.middle_name[0]}.`} {profile.last_name}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Student</p>
          </div>
        </div>

        {/* Information Grid */}
        <div className="space-y-6">
          {editing ? (
            // Edit Mode
            <>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                    placeholder="First Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="middle_name">Middle Name</Label>
                  <Input
                    id="middle_name"
                    value={editForm.middle_name}
                    onChange={(e) => setEditForm({ ...editForm, middle_name: e.target.value })}
                    placeholder="Middle Name (Optional)"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={editForm.last_name}
                    onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                    placeholder="Last Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year_level">Year Level</Label>
                  <Input
                    id="year_level"
                    value={editForm.year_level}
                    onChange={(e) => setEditForm({ ...editForm, year_level: e.target.value })}
                    placeholder="Year Level"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={handleSave} 
                  disabled={saving}
                  className="flex-1"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button 
                  onClick={handleCancel} 
                  variant="outline"
                  disabled={saving}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            // View Mode
            <>
              <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground mb-1">Email Address</p>
                  <p className="font-medium truncate">{user?.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <IdCard className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground mb-1">Student ID</p>
                  <p className="font-medium">{profile.student_id}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground mb-1">Course</p>
                  <p className="font-medium">{profile.course?.course_name || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground mb-1">Year Level</p>
                  <p className="font-medium">Year {profile.year_level}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground mb-1">Member Since</p>
                  <p className="font-medium">{formatDate(profile.created_at)}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  )
}