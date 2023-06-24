const Footer = () => {
  const startYear = 2023;
  const currentYear = new Date().getFullYear();
  return (
    <div className="footer">
      <div className="copyright">
        Copyright &copy;
        <a
          className="App-link"
          alt="Masterpro Project"
          title="Masterpro Project"
          href="https://masterpro.ws"
          target="_blank"
          rel="noreferrer"
        >
          Masterpro.ws{" "}
          {startYear === currentYear
            ? startYear
            : startYear + "-" + currentYear}
        </a>
      </div>
    </div>
  );
};

export default Footer;
