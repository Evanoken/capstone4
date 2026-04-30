const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');

const ssmClient = new SSMClient({ region: process.env.AWS_REGION || 'us-east-1' });

exports.handler = async (event) => {
    console.log('Lambda invoked. Event received:', JSON.stringify(event, null, 2));

    const paramName = process.env.SSM_PARAM_NAME || '/app/config/greeting';

    try {
        console.log(`Fetching SSM parameter: ${paramName}`);

        const command = new GetParameterCommand({
            Name: paramName,
            WithDecryption: false,
        });

        const result = await ssmClient.send(command);
        const greeting = result.Parameter.Value;

        console.log('SUCCESS — Retrieved from SSM Parameter Store:', greeting);

        return {
            status: 'Success',
            parameterName: paramName,
            greeting: greeting,
            timestamp: new Date().toISOString(),
        };

    } catch (error) {
        console.error('ERROR — Failed to retrieve SSM parameter:', error.message);
        throw new Error(`SSM retrieval failed: ${error.message}`);
    }
};
