"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/contexts/authContext";
import { supabase } from "@/lib/config/supabase";
import QRCode from "react-qr-code";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Download,
  User as UserIcon,
  GraduationCap,
  IdCard,
  Share2,
} from "lucide-react";
import { IUserProfile } from "../../../lib/types/IUserProfile";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";

export default function MyQrPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<IUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("user_profiles")
          .select(
            `
            *,
            course:courses(course_name)
          `,
          )
          .eq("id", user.id)
          .single();

        if (error) throw error;

        setProfile(data);
      } catch (err: any) {
        console.error("Error fetching profile:", err);
        setError(err.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleDownload = () => {
    const qrContainer = document.getElementById("qr-code");
    if (!qrContainer) return;

    const svgElement = qrContainer.querySelector("svg");
    if (!svgElement) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size (QR code size + padding)
    const size = 300;
    canvas.width = size;
    canvas.height = size;

    // Fill white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const qrImg = new window.Image();

    qrImg.onload = () => {
      // Center the QR code on canvas
      const padding = 40;
      const qrSize = size - padding * 2;
      ctx.drawImage(qrImg, padding, padding, qrSize, qrSize);

      // Load and draw the center icon
      const iconImg = new window.Image();
      iconImg.onload = () => {
        const iconSize = 40;
        const iconX = (size - iconSize) / 2;
        const iconY = (size - iconSize) / 2;

        // Draw white background for icon
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(iconX - 4, iconY - 4, iconSize + 8, iconSize + 8);

        // Draw icon
        ctx.drawImage(iconImg, iconX, iconY, iconSize, iconSize);

        // Create download
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `qr-code-${profile?.student_id}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      };

      iconImg.onerror = () => {
        // If icon fails to load, just download the QR code
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `qr-code-${profile?.student_id}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      };

      iconImg.src = "/acetrack-icon.png";
    };

    qrImg.src =
      "data:image/svg+xml;base64," +
      btoa(unescape(encodeURIComponent(svgData)));
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-8">
        <div className="pt-5">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="space-y-6 pb-8 pt-5">
        <Card className="p-8 flex flex-col items-center justify-center text-center border-destructive/50 bg-destructive/5">
          <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <UserIcon className="h-6 w-6 text-destructive" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Failed to Load Profile</h3>
          <p className="text-sm text-muted-foreground">
            {error || "Unable to load your profile information"}
          </p>
        </Card>
      </div>
    );
  }

  const qrData = JSON.stringify({
    id: profile.id,
    student_id: profile.student_id,
    first_name: profile.first_name,
    last_name: profile.last_name,
    course_id: profile.course_id,
    year_level: profile.year_level,
    avatar_url: user?.user_metadata?.avatar_url || null,
  });

  const getInitials = () => {
    return `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase();
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="pt-5">
        <h1 className="text-2xl font-bold mb-1">My QR Code</h1>
        <p className="text-muted-foreground text-sm">
          Your unique QR code for attendance tracking
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* QR Code Card */}
        <Card className="p-6 space-y-2">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Scan to Check In</h2>
            <p className="text-sm text-muted-foreground">
              Present this QR code to scanners for instant attendance
            </p>
          </div>

          {/* QR Code Display */}
          <div className="flex justify-center">
            <div className="relative bg-white p-6 shadow-sm border-2 border-primary/10">
              <div id="qr-code">
                <QRCode
                  value={qrData}
                  size={220}
                  level="H"
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>
              {/* Center Icon */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="bg-white p-2 shadow-md">
                  <Image
                    src={"/acetrack-icon.png"}
                    alt="Acetrack Logo"
                    width={32}
                    height={32}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <Button onClick={handleDownload} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>

          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground text-center">
              Keep this QR code private and secure
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  QR Code Active
                </span>
              </div>
              <span className="text-xs text-blue-700 dark:text-blue-300">
                Ready to scan
              </span>
            </div>
          </div>
        </Card>

        {/* Profile Information Card */}
        <Card className="p-6">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Your Information</h2>
            <p className="text-sm text-muted-foreground">
              Profile details embedded in your QR code
            </p>
          </div>

          {/* Profile Header */}
          <div className="flex items-center gap-4 p-4 bg-muted/30">
            <Avatar className="h-12 w-12 border-2 border-primary/20">
              <AvatarImage
                src={user?.user_metadata?.avatar_url}
                alt={`${profile.first_name} ${profile.last_name}`}
              />
              <AvatarFallback className="text-lg font-semibold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate">
                {profile.first_name} {profile.last_name}
              </h3>
              <p className="text-sm text-muted-foreground">Student</p>
            </div>
          </div>

          {/* Profile Details */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <IdCard className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-0.5">
                  Student ID
                </p>
                <p className="font-semibold">{profile.student_id}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-0.5">Course</p>
                <p className="font-semibold">
                  {profile.course?.course_name || "N/A"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <UserIcon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-0.5">
                  Year Level
                </p>
                <p className="font-semibold">Year {profile.year_level}</p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-blue-500/30 flex items-center justify-center shrink-0">
              <svg
                className="h-5 w-5 text-blue-500"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">How to Use Your QR Code</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>
                  • Present your QR code to the attendance scanner at events
                </li>
                <li>• Ensure the code is clearly visible and well-lit</li>
                <li>• Download for offline access when needed</li>
                <li>
                  • Keep your QR code private - it contains your personal
                  information
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
