var debug = require('debug')('wifi-chat:routes:index')
  , fs = require('fs')

var config = null
  , parsedPage = null

var setConfig = function(configuration) {
  config = configuration
  frontendConfig = 'var config = \'' + JSON.stringify({
    reportingAddress: config.email.reportingAddress,
    domain: config.domain
  }) + '\''

  var developerSetup = ''
  if ('production' !== config.environment) {
    developerSetup = "<script>document.write('<script src=\"http://' + " +
      "(location.host || 'localhost').split(':')[0] + " +
      "':35729/livereload.js?snipver=1\"></' + 'script>')</script>"
  }
  parsedPage = fs.readFileSync(process.cwd() + '/views/index', { encoding: 'utf8'})
    .replace('%config%', frontendConfig)
    .replace('%developer-setup%', developerSetup)
}

var route = function(req, res) {
  debug('Serving index route')
  res.send(parsedPage)
}

module.exports = {
  route: route,
  setConfig: setConfig
}
