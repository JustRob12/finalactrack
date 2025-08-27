'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Search, User, BookOpen, GraduationCap, CheckCircle, XCircle, Trash2 } from 'lucide-react'

interface StudentProfile {
  id: string
  student_id: string
  first_name: string
  middle_initial?: string
  last_name: string
  course_id: number
  year_level: string
  avatar?: string
  course?: {
    course_name: string
    short: string
  } | null
}

interface Event {
  id: number
  name: string
  start_datetime: string
  end_datetime: string
  status: number
}

interface AttendanceStatus {
  event_id: number
  event_name: string
  isPresent: boolean
  time_in?: string
  time_out?: string
}

export default function SearchStudentPage() {
  const { user, checkAndRefreshSession } = useAuth()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [student, setStudent] = useState<StudentProfile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus[]>([])
  const [loadingAttendance, setLoadingAttendance] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingStudent, setDeletingStudent] = useState<StudentProfile | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      if (!user) {
        const sessionValid = await checkAndRefreshSession()
        if (!sessionValid) {
          router.push('/login')
          return
        }
      }

      if (user) {
        // Check if user is admin
        const { data, error } = await supabase
          .from('user_profiles')
          .select('role_id')
          .eq('id', user?.id)
          .maybeSingle()

        if (error || !data || data.role_id !== 0) {
          router.push('/dashboard')
          return
        }
      }
      setLoading(false)
    }

    checkSession()
  }, [user, router, checkAndRefreshSession])

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a Student ID')
      return
    }

    setSearching(true)
    setError(null)
    setStudent(null)
    setAttendanceStatus([])

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          student_id,
          first_name,
          middle_initial,
          last_name,
          course_id,
          year_level,
          avatar,
          course:courses!inner(
            course_name,
            short
          )
        `)
        .eq('student_id', searchQuery.trim())
        .eq('role_id', 1) // Only students
        .maybeSingle()

      if (error) {
        console.error('Error searching for student:', error)
        setError('Failed to search for student. Please try again.')
        return
      }

      if (!data) {
        setError('No student found with this Student ID')
        return
      }

      // Transform the data to match the interface
      const transformedData = {
        ...data,
        course: Array.isArray(data.course) ? data.course[0] : data.course
      }

      setStudent(transformedData)
      
      // Fetch attendance status for this student
      await fetchAttendanceStatus(transformedData.student_id)
    } catch (error) {
      console.error('Error searching for student:', error)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  const fetchAttendanceStatus = async (studentId: string) => {
    setLoadingAttendance(true)
    try {
      // First, get all events
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id, name, start_datetime, end_datetime, status')
        .order('start_datetime', { ascending: false })

      if (eventsError) {
        console.error('Error fetching events:', eventsError)
        return
      }

      // Then, get attendance records for this student
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .select('event_id, time_in, time_out')
        .eq('student_id', studentId)

      if (attendanceError) {
        console.error('Error fetching attendance:', attendanceError)
        return
      }

      // Create a map of event_id to attendance data
      const attendanceMap = new Map()
      attendance?.forEach(record => {
        attendanceMap.set(record.event_id, record)
      })

      // Create attendance status array
      const statusArray: AttendanceStatus[] = events?.map(event => {
        const attendanceRecord = attendanceMap.get(event.id)
        return {
          event_id: event.id,
          event_name: event.name,
          isPresent: !!attendanceRecord,
          time_in: attendanceRecord?.time_in,
          time_out: attendanceRecord?.time_out
        }
      }) || []

      setAttendanceStatus(statusArray)
    } catch (error) {
      console.error('Error fetching attendance status:', error)
    } finally {
      setLoadingAttendance(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleDeleteStudent = async () => {
    if (!deletingStudent) return

    setDeleteLoading(true)
    try {
      // Delete from user_profiles table
      const { error: profileError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', deletingStudent.id)

      if (profileError) {
        console.error('Error deleting student profile:', profileError)
        setError('Failed to delete student. Please try again.')
        return
      }

      // Clear the search results
      setStudent(null)
      setAttendanceStatus([])
      setSearchQuery('')
      setShowDeleteModal(false)
      setDeletingStudent(null)
      
      // Show success message
      setError(null)
      // You could add a success state here if needed
    } catch (error) {
      console.error('Error deleting student:', error)
      setError('An unexpected error occurred while deleting the student.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const openDeleteModal = (student: StudentProfile) => {
    setDeletingStudent(student)
    setShowDeleteModal(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.push('/admin')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back to Dashboard</span>
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <Search className="w-6 h-6 text-orange-600" />
            <h1 className="text-xl font-semibold text-gray-900">Search Student</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-6">
        <div className="max-w-2xl mx-auto">
          {/* Search Section */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Search by Student ID</h2>
            
            <div className="flex space-x-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter Student ID (e.g., 2024-1218)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={searching}
                className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {searching ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Search</span>
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}
          </div>

                     {/* Student Card */}
           {student && (
             <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
               {/* Header */}
               <div className="bg-gradient-to-r from-orange-50 to-orange-100 px-6 py-4 relative">
                 <h3 className="text-lg font-semibold text-gray-900">Student Information</h3>
                 
                 {/* Delete Button - Top Right Corner */}
                 <button
                   onClick={() => openDeleteModal(student)}
                   className="absolute top-3 right-3 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
                   title="Delete Student"
                 >
                   <Trash2 className="w-4 h-4" />
                 </button>
               </div>

              {/* Student Details */}
              <div className="p-6">
                <div className="flex items-start space-x-4">
                  {/* Avatar */}
                  <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                    {student.avatar ? (
                      <img
                        src={student.avatar}
                        alt="Profile"
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <User className="w-10 h-10 text-orange-600" />
                    )}
                  </div>

                  {/* Student Info */}
                  <div className="flex-1 space-y-4">
                    {/* Name and ID */}
                    <div>
                      <h4 className="text-xl font-semibold text-gray-900">
                        {student.first_name} {student.middle_initial} {student.last_name}
                      </h4>
                      <p className="text-sm text-gray-600">Student ID: {student.student_id}</p>
                    </div>



                    {/* Course Info */}
                    <div className="flex items-center space-x-2 text-gray-600">
                      <BookOpen className="w-4 h-4" />
                      <span className="text-sm">
                        {student.course?.course_name} ({student.course?.short})
                      </span>
                    </div>

                                         {/* Year Level */}
                     <div className="flex items-center space-x-2 text-gray-600">
                       <GraduationCap className="w-4 h-4" />
                       <span className="text-sm">{student.year_level}</span>
                     </div>
                                        </div>
                   </div>

                 {/* Attendance Status */}
                 <div className="mt-6 pt-6 border-t border-gray-200">
                   <h5 className="text-sm font-medium text-gray-900 mb-3">Event Attendance</h5>
                   {loadingAttendance ? (
                     <div className="flex items-center justify-center py-4">
                       <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                       <span className="ml-2 text-sm text-gray-600">Loading attendance...</span>
                     </div>
                   ) : attendanceStatus.length > 0 ? (
                     <div className="space-y-2">
                       {attendanceStatus.map((status) => (
                         <div key={status.event_id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                           <div className="flex items-center space-x-2">
                             {status.isPresent ? (
                               <CheckCircle className="w-4 h-4 text-green-600" />
                             ) : (
                               <XCircle className="w-4 h-4 text-red-600" />
                             )}
                             <span className="text-sm text-gray-700">{status.event_name}</span>
                           </div>
                           <div className="flex items-center space-x-1">
                             {status.isPresent ? (
                               <span className="text-xs text-green-600 font-medium">Present</span>
                             ) : (
                               <span className="text-xs text-red-600 font-medium">Absent</span>
                             )}
                           </div>
                         </div>
                       ))}
                     </div>
                   ) : (
                     <p className="text-sm text-gray-500 text-center py-4">No events found</p>
                   )}
                 </div>
               </div>
             </div>
           )}

          {/* Instructions */}
          {!student && !error && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center space-x-2 text-blue-700 mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">How to Search</span>
              </div>
              <ul className="text-blue-600 text-sm space-y-1">
                <li>• Enter the exact Student ID (e.g., 0008-0008)</li>
                <li>• The search is case-sensitive</li>
                <li>• Only registered students will appear in results</li>
                <li>• Press Enter or click Search to find the student</li>
              </ul>
            </div>
                     )}
         </div>
       </main>

       {/* Delete Confirmation Modal */}
       {showDeleteModal && deletingStudent && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
             {/* Modal Header */}
             <div className="flex items-center justify-between p-6 border-b border-gray-200">
               <h3 className="text-lg font-semibold text-gray-900">Delete Student</h3>
               <button
                 onClick={() => {
                   setShowDeleteModal(false)
                   setDeletingStudent(null)
                 }}
                 className="text-gray-400 hover:text-gray-600 transition-colors"
               >
                 <XCircle className="w-6 h-6" />
               </button>
             </div>

             {/* Modal Body */}
             <div className="p-6">
               <div className="flex items-center space-x-3 mb-4">
                 <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                   <Trash2 className="w-6 h-6 text-red-600" />
                 </div>
                 <div>
                   <h4 className="text-lg font-medium text-gray-900">Are you sure?</h4>
                   <p className="text-sm text-gray-600">This action cannot be undone.</p>
                 </div>
               </div>
               
               <div className="bg-gray-50 rounded-lg p-4 mb-6">
                 <h5 className="font-medium text-gray-900 mb-2">
                   {deletingStudent.first_name} {deletingStudent.middle_initial} {deletingStudent.last_name}
                 </h5>
                 <div className="text-sm text-gray-600 space-y-1">
                   <p><span className="font-medium">Student ID:</span> {deletingStudent.student_id}</p>
                   <p><span className="font-medium">Course:</span> {deletingStudent.course?.course_name} ({deletingStudent.course?.short})</p>
                   <p><span className="font-medium">Year Level:</span> {deletingStudent.year_level}</p>
                 </div>
               </div>

               <p className="text-sm text-gray-600 mb-6">
                 This will permanently delete the student and all associated data including attendance records. This action cannot be undone.
               </p>
             </div>

             {/* Modal Footer */}
             <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
               <button
                 onClick={() => {
                   setShowDeleteModal(false)
                   setDeletingStudent(null)
                 }}
                 className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                 disabled={deleteLoading}
               >
                 Cancel
               </button>
               <button
                 onClick={handleDeleteStudent}
                 disabled={deleteLoading}
                 className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
               >
                 {deleteLoading ? (
                   <>
                     <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                     <span>Deleting...</span>
                   </>
                 ) : (
                   <>
                     <Trash2 className="w-4 h-4" />
                     <span>Delete Student</span>
                   </>
                 )}
               </button>
             </div>
           </div>
         </div>
       )}
     </div>
   )
 }
