import { signOut } from 'firebase/auth';
import { auth } from "./firebase";

function Logout() {
  return <button onClick={() => signOut(auth)}>Logout</button>;
}

export default Logout;
