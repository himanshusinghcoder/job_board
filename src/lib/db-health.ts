import { supabase } from './supabase'

/**
 * Simple database health check to warm up the connection
 * This can help reduce latency on subsequent queries
 */
export const warmupDatabase = async (): Promise<boolean> => {
  try {
    // Simple query to check if database is responsive
    const { error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
    
    if (error) {
      console.warn('Database warmup failed:', error.message)
      return false
    }
    
    console.log('Database connection warmed up successfully')
    return true
  } catch (error) {
    console.warn('Database warmup error:', error)
    return false
  }
}

/**
 * Check database connection with timeout
 */
export const checkDatabaseConnection = async (timeoutMs: number = 3000): Promise<boolean> => {
  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database connection timeout')), timeoutMs)
    })
    
    const checkPromise = supabase
      .from('profiles')
      .select('count')
      .limit(1)
    
    await Promise.race([checkPromise, timeoutPromise])
    return true
  } catch (error) {
    console.error('Database connection check failed:', error)
    return false
  }
}