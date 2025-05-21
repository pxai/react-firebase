import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { auth } from './firebase';

function AuthStatus() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  return <span>{user ? `Logged in as ${user.email}` : 'Not logged in'}</span>;
}

export default AuthStatus;