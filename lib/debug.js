module.exports = function () {
  if (module.exports.enabled) {
    var message = [].slice.call(arguments).join(' ')
    console.log('\t' + message)
  }
}
