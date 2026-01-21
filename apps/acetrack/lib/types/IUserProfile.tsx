'use client';
export interface IUserProfile {
  id: string;
  first_name: string;
  last_name: string;
  student_id: string;
  course_id: number;
  year_level: number;
  role_id: number;
  created_at: string;
  course?: {
    course_name: string;
  };
}
