const http = require('http');
const fs = require('fs');
const path = require('path');
const analyzeHandler = require('./api/analyze');

const port = process.env.PORT || 3000;
const server = http.createServer(async (req, res) => {
  if (req.url === '/api/analyze') {
    return analyzeHandler(req, res);
  }
  const filePath = mapFilePath(req.url);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }
    res.setHeader('Content-Type', contentType(filePath));
    res.end(data);
  });
});

server.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});

function mapFilePath(urlPath) {
  if (urlPath === '/' || urlPath === '') return path.join(__dirname, 'index.html');
  const sanitized = urlPath.split('?')[0].replace(/^\//, '');
  return path.join(__dirname, sanitized);
}

function contentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html';
  if (filePath.endsWith('.css')) return 'text/css';
  if (filePath.endsWith('.js')) return 'application/javascript';
  return 'text/plain';
}
