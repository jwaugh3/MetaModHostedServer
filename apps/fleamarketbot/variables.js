
const tmi = require('tmi.js');
const { FleamarketbotSettings } = require('../../models/dbModels')

var usersArray = []

const opts = {
  connection: {
    reconnect: true
    },
  identity: {
    username: "dynamo_bot",
    password: "24j8kzjpw0xl31xaeb8ahezo6howat"
  },
  channels: [
    '#levif1'
  ]
};

// Create a client with our options
var client = new tmi.client(opts);

//   username: "fleamarketbot",
//   password: "7cdh6psjh3jqj87pidk2sxy2xvilhw"


const modifyUsersArray = async (modify, channel, settings) => {
  console.log('settings', settings)
  if(modify === 'add'){
    // console.log('before push', settings)
    usersArray.push(settings)
    // console.log('pushed', usersArray)
  } else if(modify === 'update') {

    let oldSettings = await FleamarketbotSettings.findOneAndUpdate({channel: settings.channel}, {
      mode: settings.mode,
      delay: settings.delay,
      lastTriggered: new Date(),
      targetRequester: settings.targetRequester
    }, {new: false, useFindAndModify: false})

    delete oldSettings['__v']

    let channelIndex = usersArray.findIndex((x) => x.channel === settings.channel)
      
    usersArray[channelIndex] = settings

    let keys = Object.keys(oldSettings.toJSON())
    let updatedSetting = ''
console.log(oldSettings, settings)
    keys.forEach((key)=>{
      if(oldSettings[key] !== settings[key] && updatedSetting === '' && key !== 'lastTriggered' && key !== '_id' && key !== '__v'){
        updatedSetting = key
      }
    })
console.log('updated Settings', updatedSetting)
    switch(updatedSetting){
      case '': 
        console.log('none set')
        break;
      case 'mode':
        console.log('hit mode')
        if(settings[updatedSetting] === 'allchat'){
          let target = '#' + settings.channelConnected
          client.say(target, '/me Fleamarketbot is now in All Chat Mode')
        } else if(settings[updatedSetting] === 'subonly') {
          let target = '#' + settings.channelConnected
          client.say(target, '/me Fleamarketbot is now in Sub Only Mode')
        } else if(settings[updatedSetting] === 'modonly') {
          let target = '#' + settings.channelConnected
          client.say(target, '/me Fleamarketbot is now in Mod Only Mode')
        }
        break;
      case 'delay':
        console.log('delay set')
        let target = '#' + settings.channelConnected
        client.say(target, "/me FleaMarketBot delay has been set to " + `${settings.delay}` + " seconds.")
        break;
      case 'targetRequester':
        if(settings[updatedSetting] === true){
          console.log('target true')
          let target = '#' + settings.channelConnected
          client.say(target, '/me Fleamarketbot will now target the requester')
        } else if(settings[updatedSetting] === false) {
          console.log('target false')
          let target = '#' + settings.channelConnected
          client.say(target, '/me Fleamarketbot will no longer target the requester')
        }
        break;
    }
    

    return usersArray
  } else if(modify === 'updateTrigger'){
    let channelIndex = usersArray.findIndex((x) => x.channel === channel)

    usersArray[channelIndex].lastTriggered = new Date()
  } else if(modify === 'channelName'){
    let channelIndex = usersArray.findIndex((x) => x.channel === settings.channel)
console.log(channelIndex)
    //leave original channel
    let oldChannel = usersArray[channelIndex].channelConnected
    client.leave(oldChannel)

    //join new channel
    usersArray[channelIndex].channelConnected = settings.channelConnected
    client.join(usersArray[channelIndex].channelConnected)
    
    usersArray[channelIndex].lastChanged = settings.lastChanged
  }
}

const getUsersArray = (channel) => {
  if(channel !== null){
    let userData = usersArray.find((x) => '#' + x.channel === channel)
    return userData
  } else {
    return usersArray
  }
}


// exports.usersArray = usersArray;
// module.exports = { modifyUsersArray, getUsersArray };
exports.modifyUsersArray = modifyUsersArray
exports.getUsersArray = getUsersArray
exports.client = client