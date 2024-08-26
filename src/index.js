const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const port = 3000; // You can change the port as needed

app.use(express.json());

// Initialize sqlite3 database
const db = new sqlite3.Database('user_messages.sqlite');

// Create tables if they don't exist
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userid TEXT UNIQUE NOT NULL,
            username TEXT NOT NULL
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender TEXT NOT NULL,
            receiver TEXT NOT NULL,
            message TEXT NOT NULL,
            FOREIGN KEY(sender) REFERENCES users(userid),
            FOREIGN KEY(receiver) REFERENCES users(userid)
        );
    `);
});

// Swagger definition
const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'User Messaging API',
        version: '1.0.0',
        description: 'API for managing users and sending messages',
    },
    servers: [
        {
            url: 'http://localhost:3000', // Replace with your actual server URL
            description: 'Development server',
        },
    ],
};

// Options for the swagger docs
const options = {
    swaggerDefinition,
    // Paths to files containing OpenAPI definitions
    apis: ['./src/index.js'], // Replace with the path to your main file
};

// Initialize swagger-jsdoc
const swaggerSpec = swaggerJSDoc(options);

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 1. Get a list of all users (including usernames)
/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get a list of all users
 *     description: Retrieve a list of all users with their userids and usernames.
 *     responses:
 *       200:
 *         description: A list of users.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   userid:
 *                     type: string  

 *                   username:
 *                     type: string
 */
app.get('/users', (req, res) => {
    db.all('SELECT userid,username FROM users', (err, rows) => {
        if (err) {
            res.status(500).json({ error: 'Internal server error' });
        } else {
            res.json(rows);
        }
    });
});

// 2. Send a message to a particular user id
/**
 * @swagger
 * /messages:
 *   post:
 *     summary: Send a message to a user
 *     description: Send a message to a specific user identified by their userid.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sender:
 *                 type: string
 *               receiver:
 *                 type: string  

 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Message sent successfully.
 *       500:
 *         description: Internal server error.
 */
app.post('/messages', (req, res) => {
    const { sender, receiver, message } = req.body;

    db.run('INSERT INTO messages (sender, receiver, message) VALUES (?, ?, ?)', [sender, receiver, message], function (err) {
        if (err) {
            res.status(500).json({ error: 'Internal server error' });
        } else {
            res.json({ message: 'Message sent successfully', id: this.lastID });
        }
    });
});

// 3. Retrieve all messages to my userid
/**
 * @swagger
 * /messages/{userid}:
 *   get:
 *     summary: Retrieve messages for a user
 *     description: Get all messages sent to a specific user identified by their userid.
 *     parameters:
 *       - in: path
 *         name: userid
 *         schema:
 *           type: string
 *         required: true
 *         description: The userid of the user.
 *     responses:
 *       200:
 *         description: A list of messages.
 *       500:
 *         description: Internal server error.
 */
app.get('/messages/:userid', (req, res) => {
    const userid = req.params.userid;

    db.all('SELECT * FROM messages WHERE receiver = ?', [userid], (err, rows) => {
        if (err) {
            res.status(500).json({ error: 'Internal server error' });
        } else {
            res.json(rows);
        }
    });
});

// 4. Super user view all messages
app.get('/super/messages', (req, res) => {
    // Add authentication/authorization logic here for super user access

    db.all('SELECT * FROM messages', (err, rows) => {
        if (err) {
            res.status(500).json({ error: 'Internal server error' });
        } else {
            res.json(rows);
        }
    });
});

// Helper function to generate a random userid (UUID)
const { v4: uuidv4 } = require('uuid');
function generateRandomUserid() {
    return uuidv4();
}

// POST endpoint to create a user
/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a new user
 *     description: Create a new user with a provided username. A random userid will be generated and returned in the response.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *     responses:
 *       200:
 *         description: User  
 created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userid:
 *                   type: string
 *       500:
 *         description: Internal server error.
 */
app.post('/users', (req, res) => {
    const { username } = req.body;

    const userid = generateRandomUserid();

    db.run('INSERT INTO users (userid, username) VALUES (?, ?)', [userid, username], function (err) {
        if (err) {
            res.status(500).json({ error: 'Internal server error' });
        } else {
            res.json({ userid });
        }
    });
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});