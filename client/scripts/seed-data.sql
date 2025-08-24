-- Insert sample courses
INSERT INTO public.courses (short, course_name) VALUES
('BSIT', 'Bachelor of Science in Information Technology'),
('BSCS', 'Bachelor of Science in Computer Science'),
('BSIS', 'Bachelor of Science in Information Systems'),
('BSCE', 'Bachelor of Science in Computer Engineering'),
('BSA', 'Bachelor of Science in Accountancy'),
('BSBA', 'Bachelor of Science in Business Administration'),
('BSN', 'Bachelor of Science in Nursing'),
('BSED', 'Bachelor of Science in Education'),
('BSA', 'Bachelor of Science in Architecture'),
('BSChem', 'Bachelor of Science in Chemical Engineering');

-- Insert sample roles
INSERT INTO public.roles (id, type) VALUES
(1, 'student'),
(2, 'teacher'),
(3, 'admin');
