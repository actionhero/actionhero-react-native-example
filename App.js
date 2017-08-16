import React from 'react'
import {
  View,
  Alert,
  ScrollView
} from 'react-native'
import {
  Container,
  Header,
  Body,
  Text,
  Title,
  Form,
  Item,
  Input,
  Button,
  List,
  ListItem,
  Right
} from 'native-base'
import Client from './components/client.js'

export default class App extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      client: new Client(),
      room: 'defaultRoom',
      messages: [],
      localMessage: ''
    }
  }

  componentDidMount () {
    this.connect()
  }

  connect () {
    const client = this.state.client
    client.emit = (type, data) => {
      this.forceUpdate() // always re-render on event

      switch (type) {
        case 'error':
          Alert.alert('Error', data.message || data.error || data)
          break
        case 'disconnected':
          Alert.alert('Disconnected', 'Automatically trying to reconnect...')
          break
        case 'welcome':
          this.appendMessage(data)
          break
        case 'say':
          this.appendMessage(data)
          break
      }
    }

    client.connect(() => {
      this.joinRoom()
    })
  }

  joinRoom () {
    const client = this.state.client
    client.action('createChatRoom', {name: this.state.room}, (data) => {
      client.roomAdd(this.state.room)
    })
  }

  appendMessage (message) {
    let messages = this.state.messages
    let formattedMessage = {
      key: Math.random() + (new Date()).getTime()
    }

    if (message.welcome) {
      formattedMessage.from = 'ActionHero'
      formattedMessage.message = `*** ${message.welcome} ***`
      formattedMessage.color = '#000000'
      formattedMessage.time = this.formatTime((new Date()).getTime())
    } else {
      formattedMessage.from = message.from
      formattedMessage.color = this.stringToColor(message.from)
      formattedMessage.message = message.message
      formattedMessage.time = this.formatTime(message.sentAt)
    }

    messages.push(formattedMessage)
    this.setState({messages})
  }

  formatTime (timestamp) {
    return new Date(timestamp).toLocaleTimeString()
  }

  stringToColor (string) {
    if (!string || string.length === 0) { return '#000000' }

    let hash = 0
    for (let i = 0; i < string.length; i++) {
      hash = string.charCodeAt(i) + ((hash << 5) - hash)
    }

    let color =
      ((hash >> 24) & 0xFF).toString(16) +
      ((hash >> 16) & 0xFF).toString(16) +
      ((hash >> 8) & 0xFF).toString(16) +
      (hash & 0xFF).toString(16)
    return `#${color.substring(0, 6)}`
  }

  say () {
    const client = this.state.client
    client.say(this.state.room, this.state.localMessage, () => {
      this.setState({localMessage: ''})
    })
  }

  render () {
    return (
      <Container>
        <Header>
          <Body>
            <Title>You are {this.state.client.state}</Title>
            <Text style={{color: this.stringToColor(this.state.client.id)}}>{this.state.client.id ? `as ${this.state.client.id}` : null}</Text>
          </Body>
        </Header>

        <View style={{flex: 1}}>
          <ScrollView style={{
            borderColor: 'gray',
            borderWidth: 1,
            padding: 5,
            margin: 5
          }}>
            <List>
              {
                this.state.messages.map((message) => {
                  return <ListItem key={message.key}>
                    <Body>
                      <Text style={{color: message.color}}>{message.from}</Text>
                      <Text muted>{message.message}</Text>
                    </Body>
                    <Right><Text note>{message.time}</Text></Right>
                  </ListItem>
                })
              }
            </List>
          </ScrollView>

          <View style={{borderBottomColor: 'black', borderBottomWidth: 1}} />

          <Form>
            <Item last>
              <Input
                regular
                placeholder='Hello World'
                onChangeText={(localMessage) => this.setState({localMessage})}
                value={this.state.localMessage}
              />
            </Item>
            <Button full success onPress={this.say.bind(this)}>
              <Text>Say</Text>
            </Button>
          </Form>
        </View>
      </Container>
    )
  }
}
