import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://loihofuvlpifdymbjlqh.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvaWhvZnV2bHBpZmR5bWJqbHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzODMwMzIsImV4cCI6MjA4OTk1OTAzMn0.z1xku7kvnot5SP7S9hfd-vnGGg5an4iR3i7k3X6O1Ts'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
