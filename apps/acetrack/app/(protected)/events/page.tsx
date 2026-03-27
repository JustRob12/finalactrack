"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/config/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, MapPin, Clock, Search, Filter } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

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

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("upcoming");

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("status", 1)
        .order("start_datetime", { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error fetching events:", error);
      setEvents([]);
    } finally {
      setLoading(false);
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
        month: "short",
        day: "numeric",
        year:
          start.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
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

    return `${dateLabel} • ${startTime} - ${endTime}`;
  };

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location.toLowerCase().includes(searchQuery.toLowerCase());

    const eventDate = new Date(event.start_datetime);
    const now = new Date();

    if (activeTab === "upcoming") {
      return matchesSearch && eventDate >= now;
    } else if (activeTab === "past") {
      return matchesSearch && eventDate < now;
    }

    return matchesSearch;
  });

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="pt-5">
        <h1 className="text-2xl font-bold mb-2">Events</h1>
        <p className="text-muted-foreground text-sm">
          Browse and register for upcoming campus events
        </p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past Events</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6 space-y-3">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-10">
              <Image
                src="/characters/not-found.png"
                width={80}
                height={80}
                alt="No events"
                className="mb-4"
              />
              <h3 className="font-semibold text-lg mb-1">No upcoming events</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? "Try adjusting your search"
                  : "Check back later for new events"}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredEvents.map((event) => (
                <Link key={event.id} href={`/events/${event.id}`}>
                  <Card className="h-full hover:shadow-lg transition-all cursor-pointer overflow-hidden group">
                    {event.banner ? (
                      <div className="relative w-full h-40 bg-muted">
                        <Image
                          src={event.banner}
                          alt={event.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-40 bg-primary/5 flex items-center justify-center">
                        <Calendar className="h-16 w-16 text-primary/30" />
                      </div>
                    )}

                    <div className="p-4 space-y-2">
                      <h3 className="font-semibold text-base line-clamp-1">
                        {event.name}
                      </h3>

                      {event.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {event.description}
                        </p>
                      )}

                      <div className="space-y-1.5 pt-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">
                            {formatEventDate(
                              event.start_datetime,
                              event.end_datetime,
                            )}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-6">
          <div className="flex flex-col items-center justify-center pt-10">
            <Image
              src="/characters/not-found.png"
              width={80}
              height={80}
              alt="No past events"
              className="mb-4"
            />
            <h3 className="font-semibold text-lg mb-1">No past events</h3>
            <p className="text-sm text-muted-foreground">
              Past events will appear here
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
