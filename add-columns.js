import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://eqckogifgwsazceimezt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxY2tvZ2lmZ3dzYXpjZWltZXp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4MjU2NjUsImV4cCI6MjA3NTQwMTY2NX0.pcyj3MRV9Jem-4NE7ojeADO1WJjMTnjCVnslhqpdVrc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function addEmployerColumns() {
  try {
    // Add description and location columns to employers table
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE employers 
        ADD COLUMN IF NOT EXISTS description TEXT,
        ADD COLUMN IF NOT EXISTS location TEXT;
      `
    })

    if (error) {
      console.error('Error adding columns:', error)
    } else {
      console.log('Successfully added description and location columns to employers table')
    }
  } catch (error) {
    console.error('Error:', error)
  }
}

addEmployerColumns()