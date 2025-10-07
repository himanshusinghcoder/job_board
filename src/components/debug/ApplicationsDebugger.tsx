import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

export function ApplicationsDebugger() {
  const { profile } = useAuth()
  const [debugInfo, setDebugInfo] = useState<any>(null)

  useEffect(() => {
    if (profile) {
      runDebugQueries()
    }
  }, [profile])

  const runDebugQueries = async () => {
    try {
      const debug: any = {}

      // 1. Check if user has employer profile
      const { data: employer } = await supabase
        .from('employers')
        .select('*')
        .eq('owner_id', profile?.id)
        .single()
      
      debug.employer = employer

      // 2. Check all applications in database
      const { data: allApps } = await supabase
        .from('applications')
        .select('*')
      
      debug.allApplications = allApps

      // 3. Check jobs belonging to this employer
      if (employer) {
        const { data: jobs } = await supabase
          .from('jobs')
          .select('*')
          .eq('employer_id', employer.id)
        
        debug.employerJobs = jobs
      }

      // 4. Try the full query
      if (employer) {
        const { data: fullQuery, error } = await supabase
          .from('applications')
          .select(`
            *,
            jobs(*),
            profiles(*)
          `)
          .in('job_id', (debug.employerJobs || []).map((j: any) => j.id))
        
        debug.fullQuery = { data: fullQuery, error }
      }

      setDebugInfo(debug)
    } catch (error) {
      console.error('Debug error:', error)
      setDebugInfo({ error })
    }
  }

  if (!debugInfo) {
    return <div>Loading debug info...</div>
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Applications Debug Info</h2>
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold">Current User Profile:</h3>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
            {JSON.stringify(profile, null, 2)}
          </pre>
        </div>
        
        <div>
          <h3 className="font-semibold">Employer Profile:</h3>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
            {JSON.stringify(debugInfo.employer, null, 2)}
          </pre>
        </div>

        <div>
          <h3 className="font-semibold">All Applications in Database:</h3>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
            {JSON.stringify(debugInfo.allApplications, null, 2)}
          </pre>
        </div>

        <div>
          <h3 className="font-semibold">Employer's Jobs:</h3>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
            {JSON.stringify(debugInfo.employerJobs, null, 2)}
          </pre>
        </div>

        <div>
          <h3 className="font-semibold">Full Query Result:</h3>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
            {JSON.stringify(debugInfo.fullQuery, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}