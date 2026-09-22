import LoginForm from '@/app/sign-up-login-screen/components/LoginForm';

export default function ManagerLoginPage() {
  return <main className="min-h-screen flex items-center justify-center p-6" style={{background:'#0d0f14'}}><LoginForm mode="manager" /></main>;
}