import React from "react";
import { Routes, Route } from "react-router-dom";
import HomePage from "./HomePage";
import AboutPage from "./AboutPage";
import BuildPage from "./BuildPage";
import SaveBuildPage from "./SaveBuildPage";
import NavBar from "./NavBar";
import Footer from "./Footer";

function App() {
  return (
    <div>
      <NavBar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/build" element={<BuildPage />} />
        <Route path="/save" element={<SaveBuildPage />} />
        <Route path="/about" element={<AboutPage />} />
      </Routes>
      <Footer />
    </div>
  );
}

export default App;