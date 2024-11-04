const WebSocket = require('ws');
const AWS = require('aws-sdk');

// Configure AWS SDK to use DynamoDB
AWS.config.update({
    region: 'us-east-1',  // Replace with your region
    accessKeyId: 'AKIAW3MEDCEOXKD4VZ6V',  // Replace with your actual access key
    secretAccessKey: 'ECmL7sLG3i+S+1kNPL3JrTccC4mT5Q+mqQX10CJs'  // Replace with your actual secret key
});

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const server = new WebSocket.Server({ port: 8080 });

const getLatestDataUsingScan = async () => {
    const params = {
        TableName: 'ESP32_db',  // Replace with your table name
        ProjectionExpression: 'TS, #ts, moisture, temperature, pH',  // The attributes you want to retrieve
        ExpressionAttributeNames: {
            '#ts': 'TimeStamp'
        },
        Limit: 1000  // Adjust according to the number of entries you're willing to scan
    };

    try {
        const data = await dynamoDb.scan(params).promise();
        if (data.Items.length > 0) {
            // Sort items by TimeStamp in descending order to get the latest
            data.Items.sort((a, b) => new Date(b.TimeStamp) - new Date(a.TimeStamp));
            return data.Items.slice(0, 30);  // Return the latest entry
        } else {
            console.log('No data found');
            return null;
        }
    } catch (error) {
        console.error('Error scanning data:', error);
    }
};

// Broadcast function to send data to all connected clients
function broadcast(data) {
    server.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
            console.log(data);
        }
    });
}

// Periodically fetch data from DynamoDB and broadcast to all clients
setInterval(async () => {
    const data = await getLatestDataUsingScan();
    if (data) {
        console.log('Fetched data from DynamoDB:', data);
        broadcast(data);
    }
}, 5000);  // Fetch and broadcast every 5 seconds

// Handle new WebSocket connections
server.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

console.log('WebSocket server is running on ws://localhost:8080');
