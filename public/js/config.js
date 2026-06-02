(function () {
  const baseUrl = window.location.origin;

  window.API_URL = `${baseUrl}/api`;
  window.SOCKET_URL = baseUrl;

  console.log('API_URL:', window.API_URL);
  console.log('SOCKET_URL:', window.SOCKET_URL);
})();