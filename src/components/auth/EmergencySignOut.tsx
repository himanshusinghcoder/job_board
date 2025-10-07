// Emergency sign out - minimal dependencies
export function EmergencySignOut() {
  const handleEmergencySignOut = () => {
    console.log('Emergency sign out triggered')
    
    // Clear all storage immediately
    if (typeof window !== 'undefined') {
      try {
        localStorage.clear()
        sessionStorage.clear()
      } catch (e) {
        console.error('Error clearing storage:', e)
      }
      
      // Clear specific Supabase items
      try {
        const allKeys = [...Object.keys(localStorage), ...Object.keys(sessionStorage)]
        allKeys.forEach(key => {
          if (key.includes('supabase') || key.includes('auth') || key.startsWith('sb-')) {
            localStorage.removeItem(key)
            sessionStorage.removeItem(key)
          }
        })
      } catch (e) {
        console.error('Error clearing auth storage:', e)
      }
      
      // Force redirect
      window.location.replace('/')
    }
  }

  return (
    <button
      onClick={handleEmergencySignOut}
      className="ml-2 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
      type="button"
    >
      Emergency Sign Out
    </button>
  )
}