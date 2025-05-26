import React from 'react';
import { Link } from "react-router-dom";

function Footer () {
  return (<footer>
    <p>© 2024 Txokas Games</p>
    <Link to="/about">About</Link>
    </footer>
  )
}

export default Footer;