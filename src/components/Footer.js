import { memo } from "react";

const Footer = memo(() => {
  const startYear = 2023;
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="copyright">
        Copyright ©
        <a
          className="App-link"
          alt="Masterpro Project"
          title="Masterpro Project"
          href="https://masterpro.ws"
          target="_blank"
          rel="noreferrer"
        >
          Masterpro.ws{" "}
          {startYear === currentYear ? startYear : `${startYear}-${currentYear}`}
        </a>
      </div>
    </footer>
  );
});

export default Footer;
