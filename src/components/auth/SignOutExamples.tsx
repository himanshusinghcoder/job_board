// Sign out functionality test and demonstration
// This shows how to use the sign out feature in different contexts

import { SignOutButton } from '@/components/auth/SignOutButton'

// Example 1: In a dropdown menu
export function UserDropdownMenu() {
  return (
    <div className="dropdown">
      <SignOutButton 
        variant="ghost" 
        size="sm"
        className="w-full justify-start"
        redirectTo="/"
      >
        Sign Out
      </SignOutButton>
    </div>
  )
}

// Example 2: Emergency sign out (destructive style)
export function EmergencySignOut() {
  return (
    <SignOutButton 
      variant="destructive" 
      size="md"
      redirectTo="/auth/signin"
    >
      Force Sign Out
    </SignOutButton>
  )
}

// Example 3: Mobile sign out button
export function MobileSignOut() {
  return (
    <SignOutButton 
      variant="outline" 
      size="lg"
      className="w-full"
      redirectTo="/"
    >
      Sign Out
    </SignOutButton>
  )
}