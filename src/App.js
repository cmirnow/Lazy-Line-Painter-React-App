import { useCallback } from "react";
import Particles from "react-particles";
import { loadFull } from "tsparticles";
import particlesOptions from "./assets/particles.json";
import "./styles/App.css";
import "./assets/jquery.lazylinepainter-1.7.0_modified.js";
import "./assets/painter.js";
import Footer from "./components/Footer";

function App() {
  const particlesInit = useCallback((engine) => {
    loadFull(engine);
  }, []);

  return (
    <div className="App">
      <Particles options={particlesOptions} init={particlesInit} />
      <header className="App-header">
        <div id="content_lazy">
          <div id="lazy" />
        </div>
      </header>
      <Footer />
    </div>
  );
}

export default App;
