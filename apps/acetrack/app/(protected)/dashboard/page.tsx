"use client";

import { useAuth } from "@/lib/contexts/authContext";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronRight, Calendar, MapPin, Clock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/config/supabase";

interface AttendanceStats {
  totalAttendance: number;
  todayAttendance: number;
  weekAttendance: number;
  monthAttendance: number;
  totalEvents: number;
  missedEvents: number;
  lastCheckIn: string | null;
}

interface Event {
  id: number;
  name: string;
  description: string | null;
  location: string;
  banner: string | null;
  status: number;
  start_datetime: string;
  end_datetime: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);

  useEffect(() => {
    const fetchAttendanceStats = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Get today's date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Get week start (assuming week starts on Sunday)
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        
        // Get month start
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

        // Fetch all attendance records for this student
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance')
          .select('*')
          .eq('student_id', user.id)
          .order('time_in', { ascending: false });

        if (attendanceError) throw attendanceError;

        // Fetch total events count
        const { count: eventsCount, error: eventsError } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true });

        if (eventsError) throw eventsError;

        // Calculate statistics
        const totalAttendance = attendanceData?.length || 0;
        const todayAttendance = attendanceData?.filter(record => 
          new Date(record.time_in) >= today
        ).length || 0;
        const weekAttendance = attendanceData?.filter(record => 
          new Date(record.time_in) >= weekStart
        ).length || 0;
        const monthAttendance = attendanceData?.filter(record => 
          new Date(record.time_in) >= monthStart
        ).length || 0;
        
        const totalEvents = eventsCount || 0;
        const missedEvents = totalEvents - totalAttendance;
        const lastCheckIn = attendanceData && attendanceData.length > 0 
          ? attendanceData[0].time_in 
          : null;

        setStats({
          totalAttendance,
          todayAttendance,
          weekAttendance,
          monthAttendance,
          totalEvents,
          missedEvents,
          lastCheckIn
        });
      } catch (error) {
        console.error('Error fetching attendance stats:', error);
        // Set default values on error
        setStats({
          totalAttendance: 0,
          todayAttendance: 0,
          weekAttendance: 0,
          monthAttendance: 0,
          totalEvents: 0,
          missedEvents: 0,
          lastCheckIn: null
        });
      } finally {
        setLoading(false);
      }
    };

    const fetchUpcomingEvents = async () => {
      try {
        setEventsLoading(true);
        const now = new Date().toISOString();

        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('status', 1)
          .gte('end_datetime', now)
          .order('start_datetime', { ascending: true })
          .limit(3);

        if (error) throw error;
        setUpcomingEvents(data || []);
      } catch (error) {
        console.error('Error fetching upcoming events:', error);
        setUpcomingEvents([]);
      } finally {
        setEventsLoading(false);
      }
    };

    if (user?.id) {
      fetchAttendanceStats();
      fetchUpcomingEvents();
    } else if (user === null) {
      setLoading(false);
      setEventsLoading(false);
    }
  }, [user?.id]);

  const formatLastCheckIn = (timestamp: string | null) => {
    if (!timestamp) return "No recent check-ins";
    
    const date = new Date(timestamp);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    const timeString = date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    if (isToday) {
      return `Today at ${timeString}`;
    } else {
      const dateString = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      return `${dateString} at ${timeString}`;
    }
  };

  const formatEventDate = (startDatetime: string, endDatetime: string) => {
    const start = new Date(startDatetime);
    const end = new Date(endDatetime);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const startDateStr = start.toDateString();
    const todayStr = today.toDateString();
    const tomorrowStr = tomorrow.toDateString();

    let dateLabel = '';
    if (startDateStr === todayStr) {
      dateLabel = 'Today';
    } else if (startDateStr === tomorrowStr) {
      dateLabel = 'Tomorrow';
    } else {
      dateLabel = start.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: start.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }

    const startTime = start.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    const endTime = end.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });

    return `${dateLabel} • ${startTime} - ${endTime}`;
  };

  if (loading || !user) {
    return (
      <div className="space-y-6 pb-8">
        <div className="pt-5">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-36 w-full" />
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-6 pb-8">
        <div className="pt-5">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-36 w-full" />
      </div>
    );
  }

  const getInitials = () => {
    if (user?.user_metadata?.full_name) {
      const names = user.user_metadata.full_name.split(" ");
      return names
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return "U";
  };

  return (
    <div className="space-y-6">
      {/* Welcome message */}
      <div className="flex justify-between items-center pt-5">
        <div>
          <h1 className="text-2xl font-semibold">
            Welcome back,{" "}
            {user?.user_metadata?.full_name.split(" ")[0] ||
              user?.email?.split("@")[0] ||
              "Student"}
            !
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Here's your attendance overview for today
          </p>
        </div>
        <Image
          src="/characters/welcome.png"
          alt="Welcome Character"
          width={70}
          height={70}
        />
      </div>

      <Card className="relative overflow-hidden">
        {/* Decorative circles - hidden on mobile */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 -translate-y-8 translate-x-8 hidden md:block" />
        <div className="absolute top-4 right-12 w-24 h-24 bg-primary/30 hidden md:block" />
        <div className="absolute bottom-0 right-16 w-16 h-16 bg-primary/20 translate-y-6 hidden md:block" />

        <div className="relative px-4 md:px-6">
          <div className="flex items-center justify-between gap-4 md:gap-6">
            <div className="flex-1">
              <h2 className="text-base font-semibold mb-2 md:mb-2">Your Attendance</h2>
              <div className="flex items-center gap-4 md:gap-8">
                <div className="flex items-center gap-1.5 md:gap-2">
                  <span className="text-2xl md:text-3xl font-bold text-primary">
                    {stats.totalAttendance}
                  </span>
                  <span className="text-base md:text-lg text-muted-foreground">
                    Attended
                  </span>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2">
                  <span className="text-2xl md:text-3xl font-bold text-destructive">
                    {stats.missedEvents}
                  </span>
                  <span className="text-base md:text-lg text-muted-foreground">Missed</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0 text-sm bg-linear-to-r from-muted/50 to-muted/70 p-3 mt-4 rounded-lg">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-6 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">
                  Attendance Rate:
                </span>
                <span className="font-semibold text-primary">
                  {stats.totalEvents > 0 
                    ? Math.round((stats.totalAttendance / stats.totalEvents) * 100)
                    : 0}%
                </span>
              </div>
              <div className="w-full md:w-px h-px md:h-4 bg-border hidden md:block" />
              <div>
                <span className="text-muted-foreground text-xs">
                  Last check-in: {formatLastCheckIn(stats.lastCheckIn)}
                </span>
              </div>
            </div>

            <button className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors font-medium text-xs md:text-sm w-full md:w-auto justify-center md:justify-start">
              View Full Attendance
              <ChevronRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </button>
          </div>
        </div>
      </Card>

      {/* Upcoming events */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Upcoming Events</h2>
          <button className="text-sm text-primary hover:text-primary/80 transition-colors">
            View All
          </button>
        </div>

        {eventsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : upcomingEvents.length === 0 ? (
          <Card className="p-8 flex flex-col items-center justify-center text-center">
            <Image src="/characters/not-found.png" width={60} height={60} alt="No upcoming events" className="mx-auto mt-8" />
            <p className="text-muted-foreground">No upcoming events</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Check back later for new events
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {upcomingEvents.map((event) => (
              <Link key={event.id} href={`/events/${event.id}`}>
                <Card className="p-3 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex gap-3">
                  {event.banner ? (
                    <div className="relative w-14 h-14 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                      <Image
                        src={event.banner}
                        alt={event.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm mb-0.5 truncate">
                      {event.name}
                    </h3>
                    
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">
                          {formatEventDate(event.start_datetime, event.end_datetime)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    </div>
                  </div>

                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 self-center" />
                </div>
              </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
