import { Suspense } from 'react'
import LoginForm from './LoginForm'

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-sm text-gray-500">Loading…</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
