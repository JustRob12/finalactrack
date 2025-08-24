# FinalActrack - Student Attendance System

A professional student attendance tracking system built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Features

- 🔐 **Authentication System**: Secure login and registration with Supabase Auth
- 👨‍🎓 **Student Dashboard**: Professional dashboard with student information and statistics
- 📊 **Attendance Tracking**: Track student attendance for events and courses
- 🎨 **Modern UI**: Beautiful orange and white theme with responsive design
- 📱 **Mobile Responsive**: Works perfectly on all devices
- 🔒 **Secure**: Built with security best practices

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Icons**: Lucide React
- **Styling**: Tailwind CSS with custom orange theme

## Database Schema

The application uses the following Supabase tables:

- `user_profiles`: Student user information
- `courses`: Available courses
- `events`: Events for attendance tracking
- `attendance`: Attendance records
- `roles`: User roles

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd finalactrack/client
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new Supabase project
   - Run the SQL schema from `scripts/seed-data.sql` in your Supabase SQL editor
   - Copy your Supabase URL and anon key

4. **Environment Variables**
   Create a `.env.local` file in the client directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Database Setup

1. **Create Tables**: The database schema is already defined in your Supabase project
2. **Insert Sample Data**: Run the SQL commands from `scripts/seed-data.sql` in your Supabase SQL editor
3. **Configure RLS**: Set up Row Level Security policies in Supabase for data protection

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── dashboard/         # Student dashboard
│   ├── login/            # Login page
│   ├── register/         # Registration page
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── contexts/             # React contexts
│   └── AuthContext.tsx   # Authentication context
└── lib/                  # Utility libraries
    └── supabase.ts       # Supabase client
```

## Features Overview

### Authentication
- User registration with student information
- Secure login/logout
- Email verification
- Password reset functionality

### Student Dashboard
- Welcome message with student name
- Statistics cards (attendance, courses, etc.)
- Student information display
- Quick action buttons
- Responsive sidebar navigation

### Registration Form
- Complete student information collection
- Course selection from database
- Year level selection
- Password validation
- Form validation and error handling

## Styling

The application uses a custom orange and white theme with:
- Primary orange color: `#f97316`
- Clean white backgrounds
- Professional card-based layouts
- Responsive grid systems
- Smooth transitions and hover effects

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, please open an issue in the repository or contact the development team.
