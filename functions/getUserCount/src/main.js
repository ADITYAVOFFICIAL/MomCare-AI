// File: functions/getUserCount/src/index.js (or main.js)

import { Client, Users } from 'node-appwrite';

/*
  Uses the context object for logging and error reporting.
  Input: Destructured context { req, res, log, error }
  Output (on success via HTTP): JSON Response { "totalUsers": 123 }
  Output (on error): Logs error via context.error, function fails.
*/
// Use the destructured context signature
export default async ({ req, res, log, error: contextError }) => {
  // --- 1. Initialize Appwrite Client (Server SDK) ---
  // Check for required environment variables
  if (
    !process.env.APPWRITE_FUNCTION_ENDPOINT ||
    !process.env.APPWRITE_FUNCTION_PROJECT_ID ||
    !process.env.APPWRITE_FUNCTION_API_KEY
  ) {
    // Use context.error to report configuration issues
    contextError('Missing required environment variables for Appwrite SDK.');
    // If res is available (HTTP trigger), send an error response. Otherwise, just let the function fail.
    if (res) {
       return res.json({ error: 'Function configuration error.' }, 500);
    }
    return; // Exit if context.error was called and no res object
  }

  const client = new Client();
  client
    .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_FUNCTION_API_KEY);

  const users = new Users(client);

  // --- 2. Fetch User Count ---
  try {
    const userList = await users.list(undefined, undefined, 1);
    const totalUsers = userList.total;

    // Use context.log for logging
    log(`Successfully fetched user count: ${totalUsers}`);

    // --- 3. Return JSON Response (ONLY if res is available - i.e., HTTP trigger) ---
    if (res) {
        return res.json({ totalUsers: totalUsers });
    } else {
        log("Execution finished (non-HTTP trigger or no response expected).");
        // For non-HTTP triggers, you might return nothing or a simple object if needed
        return { status: 'success', count: totalUsers };
    }

  } catch (err) { // Use a different variable name like 'err' to avoid conflict
    // Use context.error to log the actual error caught
    contextError(`Error fetching user list: ${err.message || err}`);
    contextError(err); // Log the full error object for details

    // If res is available, send an error response
     if (res) {
        return res.json({ error: 'Failed to retrieve user count.' }, 500);
     }
     // Otherwise, the function fails due to the contextError call above.
  }
};