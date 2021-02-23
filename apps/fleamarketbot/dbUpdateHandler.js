const { FleamarketbotSettings } = require("../../models/dbModels")


const dbUpdateHandler = (settings) => {

    FleamarketbotSettings.findOneAndUpdate({channel: settings.channel}, {
        mode: settings.mode,
        delay: settings.delay,
        lastTriggered: new Date(),
        targetRequester: settings.targetRequester
      }, {new: true, useFindAndModify: false})
      .then((res)=>console.log(res, 'result to db from command'))
    
}

module.exports = dbUpdateHandler