import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qnhppyeudwzfkhzjfnke.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuaHBweWV1ZHd6ZmtoempmbmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNDg0NTksImV4cCI6MjA3MTYyNDQ1OX0.Ojwg6Dmq5i5QCZ9eEZLERtt0ZPG5fBM6ZPxXgNuJrGM'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
