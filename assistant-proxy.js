const express = require('express');
const AssistantV2 = require('ibm-watson/assistant/v2');
const { IamAuthenticator } = require('ibm-watson/auth');

const WA_URL = process.env.WA_URL;
const WA_VERSION = process.env.WA_VERSION;
const WA_API_KEY = process.env.WA_API_KEY;
const ASSISTANT_INFO = process.env.ASSISTANT_INFO;
const DEBUG = process.env.DEBUG;

let initError = false;
let assistant = undefined;
let sessionId = "";
let assistantId = "";
let assistantInfo = {};

if (!WA_URL || !WA_VERSION || !WA_API_KEY || !ASSISTANT_INFO) {
    console.error("Missing environment variable.  WA_URL, WA_VERSION, WA_API_KEY, and ASSISTANT_INFO are required.");
    initError = true;
}

try {
    assistantInfo = JSON.parse(process.env.ASSISTANT_INFO);
} catch (e) {
    console.error("ASSISTANT_INFO value missing data.  Should be a JSON object.")
    initError = true;
}

if (!assistantInfo.wa_assistant_id) {
    console.error("ASSISTANT_INFO value missing data.  Should be a JSON object with 'wa_assistant_id' key.")
    initError = true;
}

function getSession(sessionId, assistant, assistantId) {
    return new Promise((resolve, reject) => {
        try {
            if (sessionId.trim().length > 0) {
                return resolve(sessionId);
            } else {
                return assistant.createSession({ assistantId: assistantId }).then(function (res) {
                    try {
                        let newSessionId = res.result.session_id;
                        return resolve(newSessionId);
                    } catch (e) {
                        console.error(e);
                        return resolve({ error_code: "unable-to-create-wa-session" });
                    }
                });
            }
        } catch (e) {
            console.error("No sessionID was provided in params");
            console.error(e);
            return resolve({ error_code: "unable-to-resolve-sessionId" });
        }
    });
}

function handlePost(req, res) {
    return getSession(req.body.session_id, assistant, assistantId).then((result) => {
        if (result.error_code) {
            return result;
        }
        sessionId = result;
        let payload = req.body.wa_payload;
        payload.sessionId = sessionId;
        payload.assistantId = assistantId;
        return assistant.message(payload);
    }).then((result) => {
        result.sessionId = sessionId;
        res.json({ result: result });
    }).catch(err => {
        if (err.body) {
            try {
                let body = JSON.parse(err.body);
                if (body.error === "Invalid Session") {
                    console.log("Session timed out due to inactivity. Returning error to caller.");
                    return err;
                }
            } catch (e) {
                console.log("Error body existed, but wasn't valid JSON.");
            }
        }
        console.log("Proxy got unknown error from WA.");
        console.log(err);
        res.json({error_code: "http-request-error"});
    });
}

try {
    assistant = new AssistantV2({
        version: WA_VERSION,
        authenticator: new IamAuthenticator({
            apikey: WA_API_KEY
        }),
        url: WA_URL
    });
} catch (e) {
    console.error("Error when creating assistant.", e);
    initError = true;
}

let app = express();
app.use(express.json());

app.post('/', (req, res) => {
    console.log("Got a POST request");
    if (initError) {
        res.statusCode = 500;
        res.json({error: "proxy configuration error, check logs."});
    } else if (!req.body.integration_id) {
        res.statusCode = 404;
        res.json({ error: "'integration_id' value not passed in." });
    } else if (!`${req.body.integration_id}` in ASSISTANT_INFO) {
        res.statusCode = 500;
        if (DEBUG) console.log("received integration_id of", req.body.integration_id);
        console.log("sent an integration_id that don't have in ASSISTANT_INFO.");
        res.end();
    } else {
        handlePost(req, res);
    }
});

let server = app.listen(8080, function () {
    let host = server.address().address
    let port = server.address().port

    console.log("App listening at http://%s:%s", host, port)
});
