const Primus = require('./../lib/primus.js')

export default class Client {
  constructor () {
    this.url = 'wss://demo.actionherojs.com/primus' // the second S in wss is for Secure!
    this.connection = null
    this.messageCount = 0
    this.callbacks = {}
    this.id = null
    this.events = {}
    this.rooms = []
    this.state = 'disconnected'
  }

  connect (callback) {
    this.connection = new Primus(this.url, {websockets: true})

    this.connection.on('open', () => {
      this.configure((details) => {
        if (this.state === 'connected') {
          //
        } else {
          this.state = 'connected'
          if (typeof callback === 'function') { callback(null, details) }
        }
        this.emit('connected')
      })
    })

    this.connection.on('error', (error) => {
      this.emit('error', error)
    })

    this.connection.on('reconnect', () => {
      this.messageCount = 0
      this.emit('reconnect')
    })

    this.connection.on('reconnecting', () => {
      this.emit('reconnecting')
      this.state = 'reconnecting'
      this.emit('disconnected')
    })

    this.connection.on('timeout', () => {
      this.state = 'timeout'
      this.emit('timeout')
    })

    this.connection.on('close', () => {
      this.messageCount = 0
      if (this.state !== 'disconnected') {
        this.state = 'disconnected'
        this.emit('disconnected')
      }
    })

    this.connection.on('end', () => {
      this.messageCount = 0
      if (this.state !== 'disconnected') {
        this.state = 'disconnected'
        this.emit('disconnected')
      }
    })

    this.connection.on('data', (data) => {
      this.handleMessage(data)
    })
  }

  configure (callback) {
    this.rooms.forEach(function (room) {
      this.send({event: 'roomAdd', room: room})
    })

    this.detailsView((details) => {
      this.id = details.data.id
      this.fingerprint = details.data.fingerprint
      this.rooms = details.data.rooms
      // this.emit('configured')
      callback(details)
    })
  }

  send (args, callback) {
    // primus will buffer messages when not connected
    this.messageCount++
    if (typeof callback === 'function') {
      this.callbacks[this.messageCount] = callback
    }
    this.connection.write(args)
  }

  handleMessage (message) {
    this.emit('message', message)

    if (message.context === 'response') {
      if (typeof this.callbacks[message.messageCount] === 'function') {
        this.callbacks[message.messageCount](message)
      }
      delete this.callbacks[message.messageCount]
    } else if (message.context === 'user') {
      this.emit('say', message)
    } else if (message.context === 'alert') {
      this.emit('alert', message)
    } else if (message.welcome && message.context === 'api') {
      this.welcomeMessage = message.welcome
      this.emit('welcome', message)
    } else if (message.context === 'api') {
      this.emit('api', message)
    }
  }

  action (action, params, callback) {
    if (!callback && typeof params === 'function') {
      callback = params
      params = null
    }
    if (!params) { params = {} }
    params.action = action
    this.send({event: 'action', params: params}, callback)
  }

  say (room, message, callback) {
    this.send({event: 'say', room: room, message: message}, callback)
  }

  file (file, callback) {
    this.send({event: 'file', file: file}, callback)
  }

  detailsView (callback) {
    this.send({event: 'detailsView'}, callback)
  }

  roomView (room, callback) {
    this.send({event: 'roomView', room: room}, callback)
  }

  roomAdd (room, callback) {
    this.send({event: 'roomAdd', room: room}, (data) => {
      this.configure(() => {
        if (typeof callback === 'function') { callback(data) }
      })
    })
  }

  roomLeave (room, callback) {
    var index = this.rooms.indexOf(room)
    if (index > -1) { this.rooms.splice(index, 1) }
    this.send({event: 'roomLeave', room: room}, (data) => {
      this.configure(() => {
        if (typeof callback === 'function') { callback(data) }
      })
    })
  }

  documentation (callback) {
    this.send({event: 'documentation'}, callback)
  }

  disconnect () {
    this.state = 'disconnected'
    this.client.end()
    this.emit('disconnected')
  }
}
