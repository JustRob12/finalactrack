'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Calendar, MapPin, Clock, CheckCircle, Clock3, XCircle } from 'lucide-react'

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

    // Set up real-time subscription for events
    const eventsSubscription = supabase
      .channel('events_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events'
        },
        (payload) => {
          // Refetch events when any change occurs
          fetchEvents()
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      eventsSubscription.unsubscribe()
    }
  }, [])

  const fetchEvents = async () => {
    setEventsLoading(true)
    try {
      // Fetch all events (both active and inactive) for student dashboard
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_datetime', { ascending: true })

      if (error) {
        console.error('Error fetching events:', error)
      } else {
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
            <div key={event.id} className={`bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow ${
              event.status === 0 ? 'opacity-75' : ''
            }`}>
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
                  ) : event.status === 1 ? (
                    <div className="flex items-center space-x-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                      <CheckCircle className="w-3 h-3" />
                      <span>Active</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">
                      <XCircle className="w-3 h-3" />
                      <span>Inactive</span>
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
