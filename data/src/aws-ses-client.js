//// Core modules

//// External modules
const { 
    SESClient,
    GetSendStatisticsCommand 
} = require('@aws-sdk/client-ses') // V3 SDK


//// Modules


const clientInstance = new SESClient({
    credentials: {
        accessKeyId: `${CRED.aws.ses.accessKeyId}`,
        secretAccessKey: `${CRED.aws.ses.secretAccessKey}`,
    },
    region: `${CONFIG.aws.region}`,
})

/**
 * getSendStatistics
 * 
 * @param {*}  
 * @returns 
 */
const getSendStatistics = async (input = {}) => {
    const command = new GetSendStatisticsCommand(input);
    return clientInstance.send(command) // Promise
}

module.exports = {
    clientInstance: clientInstance,
    getSendStatistics: getSendStatistics,
}