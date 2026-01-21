"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/config/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, MapPin, Clock, ArrowLeft, Users } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/lib/contexts/authContext";

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

export default function EventPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAttended, setIsAttended] = useState(false);
  const [checkingAttendance, setCheckingAttendance] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchEvent();
      checkAttendance();
    }
  }, [params.id, user?.id]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error) throw error;
      setEvent(data);
    } catch (error) {
      console.error("Error fetching event:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkAttendance = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("event_id", params.id)
        .eq("student_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      setIsAttended(!!data);
    } catch (error) {
      console.error("Error checking attendance:", error);
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

    let dateLabel = "";
    if (startDateStr === todayStr) {
      dateLabel = "Today";
    } else if (startDateStr === tomorrowStr) {
      dateLabel = "Tomorrow";
    } else {
      dateLabel = start.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: start.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
      });
    }

    const startTime = start.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const endTime = end.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    return { dateLabel, timeRange: `${startTime} - ${endTime}` };
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Image
          src="/characters/not-found.png"
          width={100}
          height={100}
          alt="Event not found"
        />
        <h2 className="text-xl font-semibold">Event not found</h2>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const { dateLabel, timeRange } = formatEventDate(
    event.start_datetime,
    event.end_datetime
  );

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-4 pt-5">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Event Details</h1>
      </div>

      {/* Event Banner */}
      {event.banner ? (
        <div className="relative w-full h-64 rounded-xl overflow-hidden bg-muted">
          <Image
            src={event.banner}
            alt={event.name}
            fill
            className="object-cover"
          />
        </div>
      ) : (
        <Card className="h-64 flex items-center justify-center bg-primary/5">
          <Calendar className="h-24 w-24 text-primary/30" />
        </Card>
      )}

      {/* Event Info */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold mb-2">{event.name}</h2>
          {event.description && (
            <p className="text-muted-foreground leading-relaxed">
              {event.description}
            </p>
          )}
        </div>

        {/* Event Details Card */}
        <Card className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">{dateLabel}</p>
              <p className="text-sm text-muted-foreground">{timeRange}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Location</p>
              <p className="text-sm text-muted-foreground">{event.location}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Users className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Status</p>
              <p className="text-sm text-muted-foreground">
                {event.status === 1 ? "Active" : "Inactive"}
              </p>
            </div>
          </div>
        </Card>

        {/* Attendance Status */}
        {isAttended ? (
          <Card className="p-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <div>
                <p className="font-semibold text-green-900 dark:text-green-100">
                  Attendance Recorded
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  You've already checked in to this event
                </p>
              </div>
            </div>
          </Card>
        ) : (
          ""
        )}
      </div>
    </div>
  );
}