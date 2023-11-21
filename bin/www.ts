import app from "../app"
import defaultConfig from '../config/default.json'
import http from "http"

let port = process.env.PORT || defaultConfig.port
let host = process.env.HOST || defaultConfig.host
app.set('port', port)

let server = http.createServer(app)

server.listen(port)
server.on('error', onError)
server.on('listening', onListening)

function onError(error: { syscall: string, code: any }) {
  if (error.syscall !== 'listen') {
    throw error
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges')
      process.exit(1)
      break
    case 'EADDRINUSE':
      console.error(bind + ' is already in use')
      process.exit(1)
      break
    default:
      throw error
  }
}

function onListening() {
  let addr = server.address()
  // @ts-ignore
  console.log(("Listening on " + `${addr.address}:${addr.port}`))
  // var bind = typeof addr === 'string'
  //   ? 'pipe ' + addr
  //   : 'port ' + addr.port
  // debug('Listening on ' + bind)
}
