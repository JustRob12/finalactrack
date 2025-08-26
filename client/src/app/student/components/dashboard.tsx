'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Calendar, MapPin, Clock, CheckCircle, Clock3 } from 'lucide-react'

interface Event {
  id: number
  location: string
  name: string
  description: string | null
  banner: string | null
  status: number
  start_datetime: string
  end_datetime: string
}

export default function Dashboard() {
  const [events, setEvents] = useState<Event[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)

  // Helper function to check if event is coming soon
  const isEventComingSoon = (eventDate: string) => {
    const eventStartDate = new Date(eventDate)
    const currentDate = new Date()
    return eventStartDate > currentDate
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    setEventsLoading(true)
    try {
      // Fetching events for student dashboard
      
      // First, let's check all events to see what's available
      const { data: allEvents, error: allEventsError } = await supabase
        .from('events')
        .select('*')
        .order('start_datetime', { ascending: true })

      if (allEventsError) {
        console.error('Error fetching all events:', allEventsError)
      } else {
        // All events in database
      }

      // Temporarily fetch all events to debug
      const { data, error } = await supabase
        .from('events')
        .select('*')
        // .eq('status', 1) // Temporarily commented out to see all events
        .order('start_datetime', { ascending: true })

      if (error) {
        console.error('Error fetching events:', error)
      } else {
        // Events found
        if (data && data.length > 0) {
                      // Event statuses retrieved
        }
        setEvents(data || [])
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setEventsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Events</h2>
        <button
          onClick={async () => {
            // Fetching all events for debugging
            const { data, error } = await supabase
              .from('events')
              .select('*')
              .order('start_datetime', { ascending: false })
            
            if (error) {
              console.error('Debug fetch error:', error)
            } else {
              // All events (debug)
              alert(`Found ${data?.length || 0} events in database`)
            }
          }}
          className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
        >
          Debug Events
        </button>
      </div> */}

      {/* Events Grid */}
      {eventsLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Events Available</h3>
          <p className="text-gray-600">Check back later for upcoming events.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div key={event.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow">
              {/* Event Banner */}
              <div className="h-48 bg-gray-200 relative">
                {event.banner ? (
                  <img 
                    src={event.banner} 
                    alt={event.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-orange-200">
                    <Calendar className="w-12 h-12 text-orange-600" />
                  </div>
                )}
                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  {isEventComingSoon(event.start_datetime) ? (
                    <div className="flex items-center space-x-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                      <Clock3 className="w-3 h-3" />
                      <span>Coming Soon</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                      <CheckCircle className="w-3 h-3" />
                      <span>Active</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Event Details */}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                  {event.name}
                </h3>
                
                {event.description && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {event.description}
                  </p>
                )}

                <div className="space-y-2">
                  {/* Location */}
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 text-orange-600" />
                    <span className="line-clamp-1">{event.location}</span>
                  </div>

                  {/* Date & Time */}
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <span>
                      {new Date(event.start_datetime).toLocaleDateString()} - {new Date(event.end_datetime).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
