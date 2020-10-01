const http = require('http');

http.createServer(function (req, res) {
   if (req.method === "GET") {

      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("hi Troy");

   } else if (req.method === "POST") {

      req.on("end", function () {
         res.writeHead(200, { "Content-Type": "application/json" });
         res.end({ akey: "avalue", bkey: "bvalue" });
      });

   }
}).listen(8080);

console.log('Server running at http://0.0.0.0:8080/');