import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

// Hook to get candidate dashboard statistics
export function useCandidateStats() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['candidateStats', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null

      // Get applications count
      const { data: applications, error: appsError } = await supabase
        .from('applications')
        .select('id, status, created_at')
        .eq('candidate_id', profile.id)

      if (appsError) throw appsError

      // Get candidate profile
      const { data: candidateProfile, error: profileError } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('user_id', profile.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') throw profileError

      // Mock profile views (since we don't have tracking yet)
      const profileViews = Math.floor(Math.random() * 25) + 5

        // Calculate matches (jobs that might be good fit)
        let matches = 0
        if (candidateProfile?.skills) {
          const { data: jobs, error: jobsError } = await supabase
            .from('jobs')
            .select('id, skills_required')
            .eq('active', true)

          if (!jobsError && jobs) {
            matches = jobs.filter(job => 
              job.skills_required?.some((skill: string) => 
                candidateProfile.skills?.some((candidateSkill: string) => 
                  candidateSkill.toLowerCase().includes(skill.toLowerCase()) ||
                  skill.toLowerCase().includes(candidateSkill.toLowerCase())
                )
              )
            ).length
          }
        }      return {
        applications: applications?.length || 0,
        activeApplications: applications?.filter(app => 
          ['pending', 'reviewed', 'interviewed'].includes(app.status)
        ).length || 0,
        profileViews,
        matches,
        hasProfile: !!candidateProfile
      }
    },
    enabled: !!profile?.id && profile.role === 'candidate'
  })
}

// Hook to get recent applications
export function useRecentApplications(limit = 5) {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['recentApplications', profile?.id, limit],
    queryFn: async () => {
      if (!profile?.id) return []

      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          created_at,
          jobs (
            id,
            title,
            employers (
              name
            )
          )
        `)
        .eq('candidate_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data || []
    },
    enabled: !!profile?.id && profile.role === 'candidate'
  })
}

// Hook to get job recommendations
export function useJobRecommendations(limit = 5) {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['jobRecommendations', profile?.id, limit],
    queryFn: async () => {
      console.log('🔍 useJobRecommendations called with profile:', profile?.id)
      
      if (!profile?.id) {
        console.log('❌ No profile ID found')
        return []
      }

      // Get candidate profile first
      const { data: candidateProfile, error: profileError } = await supabase
        .from('candidate_profiles')
        .select('skills, years_experience, work_type')
        .eq('user_id', profile.id)
        .single()

      console.log('👤 Candidate profile query result:', { candidateProfile, profileError })

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('❌ Profile error:', profileError)
        throw profileError
      }
      
      // If no candidate profile, still show some recent jobs as recommendations
      if (!candidateProfile) {
        console.log('📝 No candidate profile found, showing recent jobs as recommendations')
        
        const { data: recentJobs, error: recentJobsError } = await supabase
          .from('jobs')
          .select(`
            id,
            title,
            description,
            skills_required,
            remote,
            salary_min,
            salary_max,
            location,
            created_at,
            employers (
              id,
              name,
              logo_url
            )
          `)
          .eq('active', true)
          .order('created_at', { ascending: false })
          .limit(limit)
        
        console.log('📊 Recent jobs fallback result:', { jobs: recentJobs?.length, recentJobsError })
        
        if (recentJobsError) {
          console.error('❌ Recent jobs error:', recentJobsError)
          throw recentJobsError
        }

        // Get applications even without profile to show applied status
        const { data: applications, error: appsError } = await supabase
          .from('applications')
          .select('id, job_id, status, created_at')
          .eq('candidate_id', profile.id)

        if (appsError) {
          console.error('❌ Applications error in fallback:', appsError)
          throw appsError
        }

        // Create application map for fallback jobs
        const fallbackApplicationMap = new Map()
        if (applications) {
          applications.forEach(app => {
            fallbackApplicationMap.set(app.job_id, {
              application_id: app.id,
              application_status: app.status,
              applied_at: app.created_at,
              has_applied: true
            })
          })
        }
        
        const fallbackJobs = (recentJobs || []).map(job => {
          const applicationInfo = fallbackApplicationMap.get(job.id) || {
            application_id: null,
            application_status: null,
            applied_at: null,
            has_applied: false
          }

          return {
            ...job,
            match_score: 50, // Default score when no profile exists
            ...applicationInfo
          }
        })
        
        console.log('✅ Fallback recommendations:', fallbackJobs.length, 'jobs')
        return fallbackJobs
      }

      // Get active jobs
      console.log('🔍 Fetching active jobs...')
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select(`
          id,
          title,
          description,
          skills_required,
          remote,
          salary_min,
          salary_max,
          location,
          created_at,
          employers (
            id,
            name,
            logo_url
          )
        `)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(50) // Get more to score and filter

      console.log('📊 Jobs query result:', { jobs: jobs?.length, jobsError })

      if (jobsError) {
        console.error('❌ Jobs error:', jobsError)
        throw jobsError
      }
      if (!jobs || jobs.length === 0) {
        console.log('❌ No active jobs found')
        return []
      }

      // Get candidate's applications to check which jobs they've already applied to
      console.log('🔍 Fetching candidate applications...')
      const { data: applications, error: appsError } = await supabase
        .from('applications')
        .select('id, job_id, status, created_at')
        .eq('candidate_id', profile.id)

      console.log('📊 Applications query result:', { applications: applications?.length, appsError })

      if (appsError) {
        console.error('❌ Applications error:', appsError)
        throw appsError
      }

      // Create a map of job applications for quick lookup
      const applicationMap = new Map()
      if (applications) {
        applications.forEach(app => {
          applicationMap.set(app.job_id, {
            application_id: app.id,
            application_status: app.status,
            applied_at: app.created_at,
            has_applied: true
          })
        })
      }

      // Simple scoring algorithm
      const scoredJobs = jobs.map(job => {
        let score = 0
        
        // Skills match (60% weight) - increased since we removed experience matching
        if (candidateProfile.skills && job.skills_required) {
          const matchingSkills = candidateProfile.skills.filter((candidateSkill: string) =>
            job.skills_required.some((jobSkill: string) =>
              candidateSkill.toLowerCase().includes(jobSkill.toLowerCase()) ||
              jobSkill.toLowerCase().includes(candidateSkill.toLowerCase())
            )
          )
          const skillScore = job.skills_required.length > 0 ? (matchingSkills.length / job.skills_required.length) * 60 : 0
          score += skillScore
        }

        // Work type match (25% weight) - increased weight
        if (candidateProfile.work_type && job.remote !== undefined) {
          // Convert job's remote boolean to work type preference
          const jobWorkType = job.remote ? 'remote' : 'onsite'
          if (candidateProfile.work_type.includes(jobWorkType) || candidateProfile.work_type.includes('hybrid')) {
            score += 25
          }
        }

        // Recency bonus (15% weight) 
        const daysSincePosted = Math.floor((Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24))
        const recencyScore = Math.max(0, 15 - daysSincePosted * 0.5)
        score += recencyScore

        // Add minimum base score to ensure all jobs have some compatibility
        const baseScore = 25
        const finalScore = Math.max(baseScore, score)

        // Add application status information
        const applicationInfo = applicationMap.get(job.id) || {
          application_id: null,
          application_status: null,
          applied_at: null,
          has_applied: false
        }

        return { 
          ...job, 
          match_score: Math.round(finalScore),
          ...applicationInfo
        }
      })

      // Sort by score and return top matches
      console.log('⚡ Scored jobs sample:', scoredJobs.slice(0, 3).map(j => ({ id: j.id, title: j.title, score: j.match_score })))
      
      const filteredJobs = scoredJobs
        .filter(job => job.match_score > 10) // Show jobs with any reasonable match
        .sort((a, b) => b.match_score - a.match_score)
        .slice(0, limit)

      console.log('✅ Final recommendations:', filteredJobs.length, 'jobs')
      console.log('📋 Top recommendations:', filteredJobs.map(j => ({ id: j.id, title: j.title, score: j.match_score })))

      return filteredJobs
    },
    enabled: !!profile?.id && profile.role === 'candidate',
    staleTime: 1000 * 60 * 15 // 15 minutes
  })
}

// Hook to get recent activity
export function useRecentActivity(limit = 10) {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['recentActivity', profile?.id, limit],
    queryFn: async () => {
      if (!profile?.id) return []

      const activities = []

      // Get recent applications
      const { data: applications } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          created_at,
          updated_at,
          jobs (
            title,
            employers (name)
          )
        `)
        .eq('candidate_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (applications) {
        applications.forEach(app => {
          const job = Array.isArray(app.jobs) ? app.jobs[0] : app.jobs
          const employer = job?.employers && Array.isArray(job.employers) ? job.employers[0] : job?.employers
          const employerName = employer && typeof employer === 'object' && 'name' in employer ? employer.name : 'Unknown Company'
          
          activities.push({
            id: `app-${app.id}`,
            type: 'application',
            title: `Applied to ${job?.title || 'Unknown Job'}`,
            description: `at ${employerName}`,
            date: app.created_at,
            status: app.status
          })
        })
      }

      // Get profile updates (simulated for now)
      const { data: profile_data } = await supabase
        .from('candidate_profiles')
        .select('updated_at')
        .eq('user_id', profile.id)
        .single()

      if (profile_data && profile_data.updated_at) {
        activities.push({
          id: 'profile-update',
          type: 'profile_update',
          title: 'Updated profile',
          description: 'Added new skills and experience',
          date: profile_data.updated_at,
          status: 'completed'
        })
      }

      // Sort by date
      return activities
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit)
    },
    enabled: !!profile?.id && profile.role === 'candidate',
    staleTime: 1000 * 60 * 5 // 5 minutes
  })
}