import { Redirect } from 'expo-router';
import { useAuth } from '@/src/auth/AuthContext';
import { hasGymPortalAccess } from '@/src/utils/roles';

export default function Index() {
  const { user } = useAuth();

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (!hasGymPortalAccess(user.role)) {
    return <Redirect href="/login" />;
  }

  return <Redirect href="/(tabs)" />;
}
