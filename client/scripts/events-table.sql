-- Create events table
CREATE TABLE public.events (
  id integer generated always as identity not null,
  location text not null,
  name text not null,
  description text null,
  banner text null,
  status integer not null,
  start_datetime timestamp without time zone not null,
  end_datetime timestamp without time zone not null,
  constraint events_pkey primary key (id),
  constraint events_status_check check ((status = any (array[0, 1])))
) TABLESPACE pg_default;

-- Insert sample events
INSERT INTO public.events (location, name, description, banner, status, start_datetime, end_datetime) VALUES
('Main Campus Auditorium', 'Annual Student Orientation', 'Welcome event for new students joining our institution', 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800', 1, '2024-02-15 09:00:00', '2024-02-15 17:00:00'),
('Library Conference Room', 'Tech Workshop Series', 'Hands-on workshop on latest technologies', 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800', 1, '2024-02-20 14:00:00', '2024-02-20 18:00:00'),
('Sports Complex', 'Inter-Department Sports Meet', 'Annual sports competition between departments', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 0, '2024-03-10 08:00:00', '2024-03-10 16:00:00'),
('Student Center', 'Career Fair 2024', 'Connect with top companies and explore career opportunities', 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800', 1, '2024-03-25 10:00:00', '2024-03-25 18:00:00'),
('Engineering Building', 'Science Exhibition', 'Showcase of student projects and innovations', 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800', 0, '2024-04-05 09:00:00', '2024-04-05 17:00:00');
