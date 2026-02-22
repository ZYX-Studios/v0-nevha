require('dotenv').config({ path: '.env' });
const { google } = require('googleapis');

async function run() {
    console.log('--- Debugging Google Auth (Attempt 3: Regex Extraction) ---');
    let rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
    if (!rawKey) {
        console.error('ERROR: GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is undefined');
        return;
    }

    // 1. Literal \n replacement (crucial for .env single-line values)
    let processedKey = rawKey.replace(/\\n/g, '\n');

    // 2. Regex extraction to find the PEM block exactly
    // Matches from -----BEGIN to -----END (inclusive) and ignores surrounding junk
    const match = processedKey.match(/-----BEGIN PRIVATE KEY-----[\s\S]+?-----END PRIVATE KEY-----/);

    if (match) {
        console.log('Found PEM block via regex. Using it.');
        processedKey = match[0];
    } else {
        console.log('WARNING: Could not find strict PEM block. Attempting manual cleanup.');
        // Fallback cleanup
        processedKey = processedKey.trim();
        if (processedKey.startsWith('"')) processedKey = processedKey.slice(1);
        if (processedKey.endsWith('"')) processedKey = processedKey.slice(0, -1);
        if (processedKey.endsWith(',')) processedKey = processedKey.slice(0, -1);
        if (processedKey.endsWith('"')) processedKey = processedKey.slice(0, -1); // Check again after comma removal
    }

    console.log(`Processed key length: ${processedKey.length}`);
    console.log(`Processed Start: ${JSON.stringify(processedKey.substring(0, 20))}`);
    console.log(`Processed End: ${JSON.stringify(processedKey.substring(processedKey.length - 20))}`);

    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

    try {
        const auth = new google.auth.JWT({
            email,
            key: processedKey,
            scopes: ['https://www.googleapis.com/auth/drive.file'],
        });

        console.log('Attempting to authorize...');
        await auth.authorize();
        console.log('Authorization SUCCESS!');
    } catch (err) {
        console.error('Authorization FAILED:', err.message);
        if (err.opensslErrorStack) {
            console.error('OpenSSL Stack:', err.opensslErrorStack);
        }
    }
}

run();
