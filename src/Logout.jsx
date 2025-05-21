import { signOut } from 'firebase/auth';
import { auth } from "./firebase";

function Logout() {
  return <span className="link-style" onClick={() => signOut(auth)}>Logout</span>;
}

export default Logout;
