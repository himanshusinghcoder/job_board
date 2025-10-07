// Quick test to verify Supabase connection
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = 'https://jzqwqfjnkkjxflqlnzol.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6cXdxZmpua2tqeGZscWxuem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MzExMjksImV4cCI6MjA3NTMwNzEyOX0.vqT4kerL0C-5bJ36T4pYE2iyhLaxNJq9IeplP6HhvIE'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  console.log('Testing Supabase connection...')
  
  try {
    // Test database connection
    const { data, error } = await supabase.from('profiles').select('count').limit(1)
    if (error) {
      console.error('Database connection failed:', error.message)
    } else {
      console.log('Database connection successful!')
    }
    
    // Test auth service
    const { data: session, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) {
      console.error('Auth service error:', sessionError.message)
    } else {
      console.log('Auth service accessible!')
    }
    
  } catch (err) {
    console.error('Connection test failed:', err)
  }
}

testConnection()