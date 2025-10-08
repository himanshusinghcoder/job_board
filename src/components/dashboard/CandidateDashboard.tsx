import { Button } from '@/components/ui/Button'
import { Link } from 'react-router-dom'
import { 
  useCandidateStats, 
  useJobRecommendations, 
} from '../../hooks/useCandidateDashboard'

export function CandidateDashboard() {
  const { data: stats, isLoading: statsLoading } = useCandidateStats()
  const { data: recommendations, isLoading: recsLoading } = useJobRecommendations()

  // Debug logging
  console.log('🏠 CandidateDashboard render:', { 
    stats, 
    recommendations: recommendations?.length, 
    recsLoading,
    statsLoading 
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Candidate Dashboard</h1>
        <Link to="/profile">
          <Button>
            {stats?.hasProfile ? 'Update Profile' : 'Complete Profile'}
          </Button>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Profile Views</h3>
          {statsLoading ? (
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-16 mt-1"></div>
            </div>
          ) : (
            <p className="text-3xl font-bold text-blue-600">{stats?.profileViews || 0}</p>
          )}
          <p className="text-sm text-gray-500 mt-1">This month</p>
        </div> */}
        <Link to="/my-applications" className="block">
          <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer">
            <h3 className="text-lg font-medium text-gray-900">Applications</h3>
            {statsLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-16 mt-1"></div>
              </div>
            ) : (
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-green-600">{stats?.applications || 0}</p>
                <p className="text-lg text-gray-500">total</p>
              </div>
            )}
            <p className="text-sm text-gray-500 mt-1">
              {stats?.activeApplications || 0} active • Click to view all
            </p>
          </div>
        </Link>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Matches</h3>
          {statsLoading ? (
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-16 mt-1"></div>
            </div>
          ) : (
            <p className="text-3xl font-bold text-purple-600">{stats?.matches || 0}</p>
          )}
          <p className="text-sm text-gray-500 mt-1">New job matches</p>
        </div>
      </div>

      {/* Recommended Jobs */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Recommended Jobs</h2>
            <Link to="/jobs">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </div>
        </div>
        <div className="p-6">
          {recsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4 mt-1"></div>
                </div>
              ))}
            </div>
          ) : recommendations && recommendations.length > 0 ? (
            <div className="space-y-4">
              {recommendations.map((job) => (
                <div key={job.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-lg font-medium text-gray-900">{job.title}</h3>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {job.match_score}% match
                        </span>
                        {job.has_applied && (
                          <Link 
                            to={`/applications/${job.application_id}`}
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors cursor-pointer"
                          >
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Applied • {job.application_status?.charAt(0).toUpperCase() + job.application_status?.slice(1)}
                          </Link>
                        )}
                      </div>
                      <p className="text-gray-600 mt-1">
                        {(() => {
                          const employer = Array.isArray(job.employers) ? job.employers[0] : job.employers
                          return employer && typeof employer === 'object' && 'name' in employer ? employer.name : 'Unknown Company'
                        })()}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">{job.location}</p>
                      {job.skills_required && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {job.skills_required.slice(0, 4).map((skill: string) => (
                            <span 
                              key={skill}
                              className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700"
                            >
                              {skill}
                            </span>
                          ))}
                          {job.skills_required.length > 4 && (
                            <span className="text-xs text-gray-500">+{job.skills_required.length - 4} more</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Link to={`/jobs/${job.id}`}>
                        <Button size="sm">View Job</Button>
                      </Link>
                      {job.has_applied && (
                        <Link to={`/applications/${job.application_id}`}>
                          <Button variant="outline" size="sm" className="text-xs">
                            View Application
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6.414M16 6H8m0 0v-.172a2 2 0 00-.586-1.414l-2-2M8 6v6.414A2 2 0 01.586 14.828l-2 2" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No job recommendations yet</h3>
              <p className="mt-2 text-sm text-gray-500">
                {stats?.hasProfile 
                  ? "We'll find matching jobs based on your profile. Check back soon!"
                  : "Complete your profile to get personalized job recommendations."
                }
              </p>
              {!stats?.hasProfile && (
                <Link to="/profile" className="mt-4 inline-block">
                  <Button>Complete Profile</Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}