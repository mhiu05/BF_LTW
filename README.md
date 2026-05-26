# Photo Sharing Backend

This is the backend for the Photo Sharing application.

## Running on CodeSandbox

This project is configured to run smoothly on CodeSandbox. When you import this repository into CodeSandbox (via GitHub), it will automatically install dependencies and start the Node.js server.

### Available Scripts

- `npm start`: Starts the application server using `server.js`.
- `npm run db-load`: Script to seed/load initial data into the database.

### Environment Variables

If you need to set up environment variables (like MongoDB connection strings or JWT secrets), create a `.env` file in the root of the project, or configure the Environment Variables section in CodeSandbox.

Example `.env`:
```
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/test
```
