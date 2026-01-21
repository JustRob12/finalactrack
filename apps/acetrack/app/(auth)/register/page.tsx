'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/authContext'

export default function RegisterPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="bg-background flex min-h-svh flex-col items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  if (user) {
    return null
  }

  return <div>Register Page</div>;
}
