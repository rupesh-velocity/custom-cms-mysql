import UserForm from '@/components/UserForm';

export default function NewUserPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Add New User</h1>
        <p className="text-gray-500 mt-2">Create a new user account and assign them a role.</p>
      </div>
      <UserForm />
    </div>
  );
}
