import inquirer from "inquirer";
import dotenv from "dotenv";
import express from "express";
import { Config } from "types/config";
import { google } from "googleapis";

async function main() {
  dotenv.config();

  const answersFromEnv: Partial<Config> = {};
  if(process.env.GAPI_CLIENT_ID) answersFromEnv.clientId = process.env.GAPI_CLIENT_ID;
  if(process.env.GAPI_CLIENT_SECRET) answersFromEnv.clientSecret = process.env.GAPI_CLIENT_SECRET;
  if(process.env.GAPI_SCOPES) answersFromEnv.scopes = process.env.GAPI_SCOPES.replace(/ /g, "").split(",");
  if(process.env.GAPI_ACCESS_TYPE) answersFromEnv.accessType = process.env.GAPI_ACCESS_TYPE;
  if(process.env.GAPI_INCLUDE_GRANTED_SCOPES) answersFromEnv.includeGrantedScopes = process.env.GAPI_INCLUDE_GRANTED_SCOPES.toLowerCase() === "true";
  if(process.env.PORT) answersFromEnv.port = Number.parseInt(process.env.PORT);

  const answers = await inquirer
    .prompt<Config>(
      [
        {
          name: "clientId",
          message: "OAuth 2.0 Client ID",
          type: "input",
        },
        {
          name: "clientSecret",
          message: "OAuth 2.0 Client Secret",
          type: "input",
        },
        {
          name: "scopes",
          message: "Scopes",
          type: "input",
          default: "email",
          filter(input) {
            return input.replace(/ /g, "").split(",");
          },
        },
        {
          name: "accessType",
          message: "Access Type",
          type: "input",
          default: "offline",
        },
        {
          name: "includeGrantedScopes",
          message: "Include Granted Scopes",
          type: "confirm",
          default: true,
        },
        {
          name: "port",
          message: "Redirect URI TCP Port",
          type: "input",
          default: "8080",
          filter(input) {
            return Number.parseInt(input);
          },
        },
      ],
      answersFromEnv,
    );

  // Init Google API Client
  const oauth2Client = new google.auth.OAuth2(
    answers.clientId,
    answers.clientSecret,
    `http://localhost:${answers.port}/`,
  );

  // Generate authorization URL
  const authorizationUrl = oauth2Client.generateAuthUrl({
    access_type: answers.accessType,
    scope: answers.scopes,
    include_granted_scopes: answers.includeGrantedScopes,
  });

  console.log(`Authentication URL:\n${authorizationUrl}`);

  // Web Server
  const app = express();
  app.use(express.json());

  app.get("/", async (req, res) => {
    const {
      error,
      code,
    } = req.query || {};

    if(typeof error === "string") {
      res.status(500).send(`Error: ${error}`);
    }
    else if(typeof code === "string") {
      try {
        const { tokens } = await oauth2Client.getToken(code)
        res.status(200).json(tokens);
      }
      catch(err) {
        res.status(500).send(err instanceof Error ? err.message : err);
      }
    }
    else {
      res.sendStatus(400);
    }

    process.exit();
  });

  app.listen(answers.port);
}

main();
