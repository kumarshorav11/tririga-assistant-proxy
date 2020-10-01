const http = require('http');

http.createServer(function (request, response) {
   //target = process.env.TARGET ? process.env.TARGET : 'World' ;
   //msg = process.env.MSG ? process.env.MSG : 'Hello ' + target + '\n';
   msg = { akey: "value", bkey: "value2" };
   response.writeHead(200, {'Content-Type': 'application/json'});
   response.end(msg);
}).listen(8080);

console.log('Server running at http://0.0.0.0:8080/');