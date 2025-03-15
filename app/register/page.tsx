import { RegisterForm } from '@/components/auth/register-form';

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Create an account</h1>
          <p className="text-gray-600">Please fill in your information</p>
        </div>
        <RegisterForm />
      </div>
    </main>
  );
} 