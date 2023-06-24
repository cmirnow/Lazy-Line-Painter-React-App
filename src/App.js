import React, { useCallback } from "react";
import Particles from "react-particles";
import { loadFull } from "tsparticles";
import "./App.css";
import particlesOptions from "./particles.json";
import "./jquery.lazylinepainter-1.7.0_modified";
import "./painter";
import Footer from "./Footer";

function App() {
  const particlesInit = useCallback((main) => {
    loadFull(main);
  }, []);

  return (
    <div className="App">
      <Particles options={particlesOptions} init={particlesInit} />
      <header className="App-header">
        <div id="content_lazy">
          <div id="lazy"></div>
        </div>
      </header>
      <Footer />
    </div>
  );
}

export default App;
