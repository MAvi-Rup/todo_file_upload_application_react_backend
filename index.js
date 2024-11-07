const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const multer = require('multer');
const path = require('path');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://user:SfSzJezcUtz8PUiZ@cluster0.lobhg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        console.log('MongoDB connected');

        const taskCollection = client.db('todo_react_application').collection('task');
        const attachmentCollection = client.db('todo_react_application').collection('attachment');

        // Set up Multer storage and upload configuration
        const storage = multer.diskStorage({
            destination: (req, file, cb) => {
                cb(null, 'uploads/');
            },
            filename: (req, file, cb) => {
                cb(null, `${Date.now()}${path.extname(file.originalname)}`);
            }
        });
        const upload = multer({ storage: storage });

        // GET all tasks
        app.get('/tasks', async (req, res) => {
            const query = {};
            const tasks = await taskCollection.find(query).toArray();
            res.send(tasks);
        });

        // UPLOAD attachments
        app.post('/attachments', upload.array('files', 10), async (req, res) => {
            const taskId = req.body.taskId;
            const files = req.files;

            const attachments = files.map(file => ({
                filename: file.filename,
                originalname: file.originalname,
                size: file.size,
                taskId: taskId
            }));

            const result = await attachmentCollection.insertMany(attachments);
            await taskCollection.updateOne(
                { _id: ObjectId(taskId) },
                { $inc: { attachmentCount: attachments.length } }
            );
            res.send(result);
        });

        // GET attachments for a task
        app.get('/attachments/:taskId', async (req, res) => {
            const taskId = req.params.taskId;
            const query = { taskId: taskId };
            const attachments = await attachmentCollection.find(query).toArray();
            res.send(attachments);
        });

        // DELETE an attachment
        app.delete('/attachments/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await attachmentCollection.deleteOne(query);
            res.send(result);
        });

        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    } catch (error) {
        console.error(error);
    }
}

// Run the server without closing the client connection
run().catch(console.dir);
