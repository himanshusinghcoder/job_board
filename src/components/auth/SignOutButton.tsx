import { Button } from '@/components/ui/Button'
import { useSignOut } from '@/hooks/useSignOut'

interface SignOutButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  redirectTo?: string
  children?: React.ReactNode
}

export function SignOutButton({ 
  variant = 'outline', 
  size = 'sm',
  className,
  redirectTo = '/',
  children = 'Sign Out'
}: SignOutButtonProps) {
  const { signOut, isSigningOut } = useSignOut()

  const handleClick = () => {
    signOut(redirectTo)
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleClick}
      loading={isSigningOut}
      disabled={isSigningOut}
    >
      {isSigningOut ? 'Signing Out...' : children}
    </Button>
  )
}