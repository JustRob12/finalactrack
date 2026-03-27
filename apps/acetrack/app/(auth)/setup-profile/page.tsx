'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/contexts/authContext'
import { supabase } from '@/lib/config/supabase'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserCircle } from 'lucide-react'

export default function SetupProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [courses, setCourses] = useState<Array<{ id: number; course_name: string }>>([])
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    studentId: '',
    program: '',
    yearLevel: '1'
  })

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return
    
    if (!user) {
      router.push('/login')
      return
    }

    // Fetch courses
    const fetchCourses = async () => {
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('id, course_name')
          .order('course_name')
        
        if (error) {
          console.error('Error fetching courses:', error)
        } else if (data) {
          setCourses(data)
        }
      } catch (err) {
        console.error('Exception fetching courses:', err)
      }
    }

    fetchCourses()

    // Pre-fill with OAuth data if available
    if (user.user_metadata?.full_name || user.user_metadata?.name) {
      const fullName = user.user_metadata.full_name || user.user_metadata.name
      const nameParts = fullName.split(' ')
      setFormData(prev => ({
        ...prev,
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || ''
      }))
    }
  }, [user, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!user) {
        throw new Error('No user found')
      }

      // Insert user profile
      const { error: insertError } = await supabase
        .from('user_profiles')
        .insert({
          id: user.id,
          first_name: formData.firstName,
          last_name: formData.lastName,
          student_id: formData.studentId,
          course_id: parseInt(formData.program),
          year_level: parseInt(formData.yearLevel),
          role_id: 1, // Student role
          created_at: new Date().toISOString()
        })

      if (insertError) {
        throw insertError
      }

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (err: any) {
      console.error('Error creating profile:', err)
      setError(err.message || 'Failed to create profile')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSelectChange = (name: string, value: string | null) => {
    if (value) {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  if (authLoading || !user) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="flex size-8 items-center justify-center rounded-md">
                  <UserCircle className="size-6" />
                </div>
                <h1 className="text-xl font-bold">Complete Your Profile</h1>
                <FieldDescription>
                  Please provide your student information to continue.
                </FieldDescription>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <Field>
                <FieldLabel htmlFor="firstName">First Name</FieldLabel>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="lastName">Last Name</FieldLabel>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="studentId">Student ID</FieldLabel>
                <Input
                  id="studentId"
                  name="studentId"
                  type="text"
                  value={formData.studentId}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="program">Program/Course</FieldLabel>
                <Select
                  items={[
                    { label: 'Select a course', value: null },
                    ...courses.map(course => ({
                      label: course.course_name,
                      value: course.id.toString()
                    }))
                  ]}
                  value={formData.program}
                  onValueChange={(value) => handleSelectChange('program', value)}
                  disabled={loading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id.toString()}>
                          {course.course_name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="yearLevel">Year Level</FieldLabel>
                <Select
                  items={[
                    { label: '1st Year', value: '1' },
                    { label: '2nd Year', value: '2' },
                    { label: '3rd Year', value: '3' },
                    { label: '4th Year', value: '4' },
                    { label: '5th Year', value: '5' },
                  ]}
                  value={formData.yearLevel}
                  onValueChange={(value) => handleSelectChange('yearLevel', value)}
                  disabled={loading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="1">1st Year</SelectItem>
                      <SelectItem value="2">2nd Year</SelectItem>
                      <SelectItem value="3">3rd Year</SelectItem>
                      <SelectItem value="4">4th Year</SelectItem>
                      <SelectItem value="5">5th Year</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Creating Profile...
                    </>
                  ) : (
                    'Complete Setup'
                  )}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </div>
      </div>
    </div>
  )
}
