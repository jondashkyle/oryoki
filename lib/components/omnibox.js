const {remote} = require('electron')
const validUrl = require('valid-url')

const config = remote.require('./config')
const updater = remote.require('./updater')
const fileHandler = remote.require('./fileHandler')
const rpc = require('../utils/rpc')

const hints = require('./hints')
const view = require('./view')

// elements
let el
let input
let overlay
let updateHint

// data
let searchDictionary = config.getSearchDictionary()

// utils
let isShown = false
let dragCount = 0

function init () {
  // elements
  el = document.querySelector('omnibox')
  input = el.querySelector('.input')
  overlay = el.querySelector('.overlay')
  updateHint = el.querySelector('.updateHint')

  // events
  input.addEventListener('keydown', onKeyDown)
  input.addEventListener('keyup', onKeyUp)

  // rpc
  rpc.on('omnibox:toggle', toggle)
  rpc.on('omnibox:hide', hide)
  rpc.on('omnibox:show', show)
  rpc.on('omnibox:focus', focus)
  rpc.on('view:title-updated', () => {
    input.value = document.querySelector('webview').getAttribute('src').split('://')[1]
  })
  rpc.on('config:search-dictionary-updated', updateSearchDictionary)

  // always keep the omnibox in focus
  overlay.addEventListener('mousedown', (e) => {
    focus()
    e.preventDefault()
  })

  // check on updater
  refreshUpdaterStatus()
  rpc.on('updater-refresh', refreshUpdaterStatus)

  // init hints
  hints.init()

  // drag&drop
  el.ondragover = (e) => {
    e.preventDefault()
  }

  el.ondragenter = (e) => {
    dragCount++
    input.classList.add('drop')
    e.preventDefault()
  }

  el.ondragleave = (e) => {
    dragCount--
    if (dragCount === 0) input.classList.remove('drop')
    e.preventDefault()
  }

  el.ondrop = (e) => {
    input.classList.remove('drop')
    dragCount = 0
    fileHandler.handleFile(e.dataTransfer.files[0].path, '_self')
    e.preventDefault()
  }

  show()
  console.log('[omnibox] ✔')
}

function onKeyDown (e) {
  if (e.keyCode === 40 || e.keyCode === 38) return
  if (e.keyCode === 13) {
    input.classList.add('highlight')
    e.preventDefault()
  }
}

function onKeyUp (e) {
  if (e.key === 'Escape') {
    hide()
    return
  }

  if (e.keyCode === 40 || e.keyCode === 38) {
    // up & down
    e.preventDefault()
    return
  }

  if (e.ctrlKey && e.keyCode === 13 && searchDictionary.direct) {
    // direct search (ctrl+enter)
    let raw = input.value
    let url = searchDictionary.direct.replace('{query}', raw)

    rpc.emit('status:log', {
      body: 'Looking for <i>' + raw + '</i>'
    })

    input.classList.remove('highlight')
    rpc.emit('omnibox:submit')
    view.load(url)
    hide()
    e.preventDefault()
    return
  }

  if (e.keyCode === 13) {
    input.classList.remove('highlight')
    submit()
    e.preventDefault()
    return
  }

  var customSearch = getCustomSearch()

  if (customSearch != null) {
    input.classList.add('hintShown')
    hints.render(input.value, customSearch)
  } else {
    hints.hide()
    input.classList.remove('hintShown')
  }
}

function submit () {
  var raw = input.value
  var output = null

  var domain = new RegExp(/[a-z0-9-]+(\.[a-z]+)+/ig) // letters|numbers|dash dot letters
  var port = new RegExp(/(:[0-9]*)\w/g)

  var customSearch = getCustomSearch()

  if (customSearch === null || customSearch[0].isComplete === undefined) {
    console.log('valid', validUrl.isUri(raw))
    // is this a domain?
    if (domain.test(raw) || port.test(raw)) {
      if (!raw.match(/^[a-zA-Z]+:\/\//)) {
        output = 'http://' + raw
      } else {
        output = raw
      }
    } else {
      // use default search engine
      output = searchDictionary.default.replace('{query}', raw)
    }
  } else if (customSearch[0].isComplete) {
    // use custom search
    var keyword = customSearch[0].keyword
    var query = raw.replace(keyword, '')

    if (query.trim().length === 0) {
      // if custom search doesn't have a parameter,
      // use default URL
      output = searchDictionary.default.replace('{query}', raw)
    } else {
      console.log('[omnibox] Search URL:', customSearch[0].url)
      output = customSearch[0].url.replace('{query}', query.trim())
    }
  }

  console.log('[omnibox]  ⃯⃗→ ', output)
  rpc.emit('omnibox:submit')
  view.load(output)
  hide()
}

function show () {
  isShown = true
  el.classList.remove('hide')

  focus()
  selectAll()
}

function hide () {
  isShown = false

  el.classList.add('hide')
}

function toggle () {
  if (isShown) hide()
  else show()
}

function focus () {
  if (!isShown) return
  input.focus()
}

function selectAll () {
  focus()
  document.execCommand('selectAll', false, null)
}

function updateSearchDictionary () {
  console.log('[omnibox] Updated search dictionary')
  searchDictionary = config.getSearchDictionary()
}

function getCustomSearch () {
  var raw = input.value
  var keyword = raw.split(' ')[0].trim()

  // Empty omnibox doesn't count
  if (keyword.trim().length === 0) return null

  // Look for a complete match
  var completeMatch = searchDictionary.custom.filter(function (search) {
    return search.keyword === keyword
  })

  if (completeMatch.length > 0) {
    console.log('[omnibox] Complete match:', completeMatch[0].keyword)
    completeMatch[0].isComplete = true // Flag the match as a complete match
    return completeMatch
  }

  // Look for potential matches
  var potentialMatches = searchDictionary.custom.filter(function (search) {
    return search.keyword.includes(keyword)
  })

  console.log('[omnibox] Potential matches:', potentialMatches.length)

  if (potentialMatches.length === 0) {
    // No matches
    return null
  } else {
    return potentialMatches
  }
}

function refreshUpdaterStatus () {
  switch (updater.getStatus()) {
    case 'no-update':
      return

    case 'update-available':
      updateHint.innerHTML = 'Update available (' + updater.getLatest().version + ')'
      updateHint.className = 'updateClue available'
      updateHint.addEventListener('click', requestDownloadUpdate)
      break

    case 'downloading-update':
      updateHint.removeEventListener('click', requestDownloadUpdate)
      updateHint.innerHTML = 'Downloading'
      updateHint.className = 'updateClue downloading'
      break

    case 'update-ready':
      updateHint.innerHTML = 'Update to ' + updater.getLatest().version
      updateHint.className = 'updateClue ready'
      updateHint.addEventListener('click', () => {
        updater.quitAndInstall()
      })
      break
  }
}

function requestDownloadUpdate () {
  updater.downloadUpdate()
}

module.exports = {
  init: init,
  show: show,
  hide: hide
}
