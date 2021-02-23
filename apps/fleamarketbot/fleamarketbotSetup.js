//Runs on startup of server
const { FleamarketbotSettings } = require('../../models/dbModels');
const { modifyUsersArray, getUsersArray, client } = require('./variables');

const fleamarketbotSetup = async () => {

    let results = await FleamarketbotSettings.find({}, {_id: 0, __v: 0})

        results.forEach((result)=>{
            modifyUsersArray('add', null, result)
        })

        var counter = 0
        var x = setInterval(()=>{

            client.join('#' + results[counter].channelConnected).catch((err)=>console.log(err))

            if(counter === results.length-1){
                clearInterval(x)
            }
            counter ++
        }, 2000)

        console.log('bot setup complete')
    
}

module.exports = fleamarketbotSetup;