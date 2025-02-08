/*
All Rights Reserved, (c) 2025 series-word-freq

Author:      Martin Shaw (developer@martinshaw.co)
Created:     2025-02-08T01:57:00.521Z
Modified:     2025-02-08T01:57:00.521Z
File Name:   open_subtitles_api_client.js

Description: description

*/
const OS = require('opensubtitles.com');
const fs = require('fs');
require('dotenv').config();
const { version } = require('../package.json');
const { get } = require('https');
const chalk = require('chalk');

class OpenSubtitlesService {
    constructor () {
        this.client = this.newClientInstance();
    }

    async newClientInstance() {
        if (!process.env.OPENSUBTITLES_API_KEY)
            throw new Error('You should use the series-word-freq application\'s API key for OpenSubtitles, or your own. See: https://opensubtitles.stoplight.io/docs/opensubtitles-api/e3750fd63a100-getting-started#api-key');

        if (!process.env.OPENSUBTITLES_APP_NAME)
            throw new Error('The series-word-freq application\'s name must be set in the .env file. Please set OPENSUBTITLES_APP_NAME to the name of this application.');

        const client = new OS({
            apikey: process.env.OPENSUBTITLES_API_KEY,
            useragent: `${process.env.OPENSUBTITLES_APP_NAME} v${version}`,
        })

        return client;
    }

    async login() {
        if (!process.env.OPENSUBTITLES_USERNAME || !process.env.OPENSUBTITLES_PASSWORD) {
            if (!fs.existsSync('.env')) fs.copyFileSync('.env.example', '.env');
            throw new Error('To use series-word-freq, you must have an OpenSubtitles account.\nPlease sign up at https://www.opensubtitles.com/consumers to get your username and password.\nThen run `swf login` or add them to the .env file manually. Thank you!');
        }
        
        const response = await (await this.client).login({
            username: process.env.OPENSUBTITLES_USERNAME,
            password: process.env.OPENSUBTITLES_PASSWORD
        });

        return response;
    }

    async searchSubtitles(featureId, page = 1) {
        this.login();

        const requestOptions = {
            parent_feature_id: featureId,
            page,
            type: 'episode',
        }

        if (process.env.OPENSUBTITLES_LANGUAGES) {
            try {
                requestOptions.languages = JSON.parse(process.env.OPENSUBTITLES_LANGUAGES);
            } catch (e) {
                console.error('Error parsing OPENSUBTITLES_LANGUAGES. Please check the format of the variable in your .env file.');
            }
        }

        return await (await this.client).subtitles(requestOptions);
    }

    async searchFeatures(query) {
        this.login();

        const requestOptions = {
            query,
            type: 'tvshow',
            full_search: true,
        }

        return await (await this.client).features(requestOptions);
    }

    async downloadSubtitle(fileId, filename) {
        await this.login();

        console.log('      Downloading subtitle...', fileId, filename);

        const response = await (await this.client).download({
            file_id: fileId,
        });

        if (response == null) {
            throw new Error('Subtitles (' + fileId + ') could not be downloaded.');
        }

        if (response.remaining <= 0) {
            console.log(chalk.orange('      You have reached your download limit with OpenSubtitles. Your quote will reset in ' + response.reset_time + '. Please run this command again then to resume downloading.'));
        }

        const downloadUrl = response?.link;
        if (downloadUrl == null) return false;
        
        const file = fs.createWriteStream(filename);
        
        get(downloadUrl, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close(() => {
                    console.log('      File downloaded successfully at ' + filename);
                });
            });
        }).on('error', (err) => {
            fs.unlink(filename, () => {
                console.error('      Error downloading file:', err);
            });
        });

        return filename;
    }
}

module.exports = OpenSubtitlesService;