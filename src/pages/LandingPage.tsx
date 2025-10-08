import { Link, Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'

export function LandingPage() {
  const { user, loading } = useAuth()

  // Redirect authenticated users to dashboard
  if (user && !loading) {
    return <Navigate to="/dashboard" replace />
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="px-4 lg:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center justify-center">
          <h1 className="text-2xl font-bold text-gray-900">JobFinder</h1>
        </div>
        <nav className="flex gap-4">
          <Link to="/auth/signin">
            <Button variant="ghost">Sign In</Button>
          </Link>
          <Link to="/auth/signup">
            <Button>Get Started</Button>
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none text-gray-900">
                  AI-Powered Job Matching
                </h2>
                <p className="mx-auto max-w-[700px] text-gray-600 md:text-xl">
                  Connect talented candidates with amazing opportunities using advanced AI matching. 
                  Find your perfect job or discover exceptional talent with intelligent recommendations.
                </p>
              </div>
              <div className="space-x-4">
                <Link to="/auth/signup">
                  <Button size="lg">
                    Find Jobs
                  </Button>
                </Link>
                <Link to="/auth/signup">
                  <Button variant="outline" size="lg">
                    Hire Talent
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-white">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid items-center gap-6 lg:grid-cols-3">
              <div className="flex flex-col justify-center space-y-4 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto">
                  <span className="text-2xl">🤖</span>
                </div>
                <h3 className="text-xl font-bold">AI Matching</h3>
                <p className="text-gray-600">
                  Our advanced AI analyzes skills, experience, and preferences to find perfect matches.
                </p>
              </div>
              <div className="flex flex-col justify-center space-y-4 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto">
                  <span className="text-2xl">⚡</span>
                </div>
                <h3 className="text-xl font-bold">Fast & Efficient</h3>
                <p className="text-gray-600">
                  Skip the endless scrolling. Get personalized job recommendations in seconds.
                </p>
              </div>
              <div className="flex flex-col justify-center space-y-4 text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto">
                  <span className="text-2xl">📊</span>
                </div>
                <h3 className="text-xl font-bold">Smart Analytics</h3>
                <p className="text-gray-600">
                  Get detailed match scores and explanations to understand your compatibility.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-blue-600">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-white">
                  Ready to Get Started?
                </h2>
                <p className="mx-auto max-w-[600px] text-blue-100 md:text-xl">
                  Join thousands of companies and candidates who have found their perfect match.
                </p>
              </div>
              <div className="space-x-4">
                <Link to="/auth/signup">
                  <Button variant="secondary" size="lg">
                    Sign Up Free
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t bg-white">
        <p className="text-xs text-gray-500">
          © 2024 JobFinder. All rights reserved.
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <a className="text-xs hover:underline underline-offset-4 text-gray-500" href="#">
            Terms of Service
          </a>
          <a className="text-xs hover:underline underline-offset-4 text-gray-500" href="#">
            Privacy Policy
          </a>
        </nav>
      </footer>
    </div>
  )
}