import React from 'react';
import { Link } from "react-router-dom";
import { Info } from 'lucide-react';

function Footer () {
  return (<footer>
    <p>© 2024 Txokas Games</p>
    <Link to="/about"><Info className="icon" aria-hidden="true" />About</Link>
    </footer>
  )
}

export default Footer;