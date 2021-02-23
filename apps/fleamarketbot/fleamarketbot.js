const { itemSearch } = require('./itemSearch');
const failedResponse = require('./failedResponse');
const { successfulPriceResponse, successfulTradeResponse } = require('./successfulResponses'); 
const dbUpdateHandler = require('./dbUpdateHandler');
const fleamarketbotSetup = require('./fleamarketbotSetup');
const { modifyUsersArray, getUsersArray, client } = require('./variables')

// Connect to Twitch:
client.connect();

//setup command options
const commandOptions = ['!price', '!trade', '!barter', '!flea', '!fleamarketbot']

const onMessageHandler = async (target, user, msg, self) => {
    if (self) { return; } // Ignore messages from the bot
    if(msg.includes(";")){ return }
    const commandType = msg.trim().toLowerCase().split(' ')[0];

    if (new RegExp(commandOptions.join("|")).test(commandType)) { //check if msg starts with a known command
      let channelData = getUsersArray(null).find((x) => '#' + x.channelConnected === target)
      console.log(channelData, 'inside fleamarketbot', getUsersArray(null))
     
      var lastResponse = (new Date().getTime() - channelData.lastTriggered.getTime()) / 1000;
      
      if(channelData.delay > lastResponse && commandType !== '!flea'){ //if delay length has not passed, return
        console.log('delay triggered')
        return
      }

        const requestMsg = msg.toLowerCase().replace(commandType, '').trim()  //requested item
        if(requestMsg.length === 0 && commandType !== '!fleamarketbot'){ return } //if no item included with command then return

        if(commandType === '!price'){
          switch(channelData.mode){
            case 'allchat':
              responsePriceHandler(requestMsg, target, user, channelData)
              break;
            case 'subonly':
              if(user.subscriber === true || user.mod === true){
                responsePriceHandler(requestMsg, target, user, channelData)
              }
              break;
            case 'modonly':
              if(user.mod === true){
                responsePriceHandler(requestMsg, target, user, channelData)
              }
              break;
            default: break;
          }
        }

        else if(commandType === '!trade'){
          switch(channelData.mode){
            case 'allchat':
              responseTradeHandler(requestMsg, target, user, channelData)
              break;
            case 'subonly':
              if(user.subscriber === true || user.mod === true){
                responseTradeHandler(requestMsg, target, user, channelData)
              }
              break;
            case 'modonly':
              if(user.mod === true){
                responseTradeHandler(requestMsg, target, user, channelData)
              }
              break;
            default: break;
          }
        }

        else if(commandType === '!barter'){

        }

        else if (commandType === '!flea'){
            console.log(requestMsg)
            if(requestMsg === "commands" || requestMsg === "command"){
                client.say(target, "/me You can see a list of commands here: fleamarketbot.com")
            } 
            else if(requestMsg.includes('delay')){
              delayAmount = parseInt(requestMsg.substring(5,requestMsg.length).trim())

              if(!isNaN(delayAmount) && delayAmount.toString().length <= 3){
                delayAmount = parseInt(delayAmount)
                channelData.delay = delayAmount
                client.say(target, "/me FleaMarketBot delay has been set to " + `${delayAmount}` + " seconds.")
                dbUpdateHandler(channelData)
              }
            }
            else if(requestMsg === 'modonly' && channelData.tier === 'premium'){
              channelData.mode = 'modonly'
              client.say(target, "/me Fleamarketbot is now in Mod Only Mode")
              dbUpdateHandler(channelData)
            }
            else if(requestMsg === 'subonly' && channelData.tier === 'premium'){
              channelData.mode = 'subonly'
              client.say(target, "/me Fleamarketbot is now in Sub Only Mode")
              dbUpdateHandler(channelData)
            }
            else if(requestMsg === 'allchat' && channelData.tier === 'premium'){
              channelData.mode = 'allchat'
              client.say(target, "/me Fleamarketbot is now in All Chat Mode")
              dbUpdateHandler(channelData)
            }
            else if(requestMsg === 'mode'){
              client.say(target, `/me Fleamarketbot is in ${channelData.mode} mode`)
            } 
            else if(requestMsg === 'target'){
              channelData.targetRequester = !channelData.targetRequester
              console.log(getUsersArray(null), 'new data')
              if(channelData.targetRequester === true){
                client.say(target, '/me Fleamarketbot will now target the requester')
              } else {
                client.say(target, '/me Fleamarketbot will no longer target the requester')
              }

              dbUpdateHandler(channelData)
            }
        }

        else if (commandType === '!fleamarketbot'){
            client.say(target, "Fleamarketbot is a dedicated Tarkov bot designed to make it easy for viewers and streamers to get relevant item information quickly. More information can be found here: fleamarketbot.com")
        }
    } else { return }
}

const responsePriceHandler = async (requestMsg, target, user, channelData) => {
  let resultData = await itemSearch(requestMsg) //get item with closest name

  if(resultData.status === 'failed'){
      failedResponse(client, target, user)
  } else {
      successfulPriceResponse(client, target, user, channelData.targetRequester, resultData)
      modifyUsersArray('updateTrigger', channelData.channel, null)
  }
}

const responseTradeHandler = async (requestMsg, target, user, channelData) => {
  let resultData = await itemSearch(requestMsg) //get item with closest name

  if(resultData.status === 'failed'){
      failedResponse(client, target, user)
  } else {
      successfulTradeResponse(client, target, user, channelData.targetRequester, resultData)
      modifyUsersArray('updateTrigger', channelData.channel, null)
  }
}

//on server start-
//fetches all users from db and adds them to usersArray
//while performing client.join on all channels
fleamarketbotSetup()


// Register our event handlers (defined below)
client.on('chat', onMessageHandler);
client.on('connected', onConnectedHandler);

// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}

exports.client = client