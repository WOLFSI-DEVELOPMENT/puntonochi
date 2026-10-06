# Backend Refactoring Guide

Your `server.js` file is currently very large (160KB+) and handles everything from server initialization to business logic, database queries, and third-party integrations (GenAI, S3, OAuth).

We have set up this `src/server` directory to help you incrementally refactor it into smaller pieces without breaking your app.

## The Architecture
* **`routes/`**: Define your API endpoints here. They should not contain complex logic. (e.g., `routes/account.js`)
* **`controllers/`**: The functions that actually handle the requests and responses. (e.g., `controllers/accountController.js`)
* **`services/`**: Code that talks to the database, AWS S3, Google GenAI, etc. (e.g., `services/s3.js`, `services/db.js`)
* **`middlewares/`**: Extract your `requireNeon`, `requireAccount` functions into here.

## How to Migrate Incrementally
1. Pick a group of routes in `server.js` (e.g., all `/api/account/*` routes).
2. Create a router file like we did in `routes/account.js`.
3. Copy the logic over from `server.js`.
4. In `server.js`, import the new router and mount it:
   ```javascript
   import accountRoutes from './src/server/routes/account.js';
   app.use('/api/account', accountRoutes);
   ```
5. Test your app! If it works, repeat for the next set of routes (e.g., `/api/admin/*`, `/api/profiles/*`).
