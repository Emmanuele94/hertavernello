(() => {
  const id = 'home-readable-css';
  if (!document.getElementById(id)) {
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = 'home-readable.css';
    document.head.appendChild(link);
  }
})();
