/*
All Rights Reserved, (c) 2025 series-word-freq

Author:      Martin Shaw (developer@martinshaw.co)
Created:     2025-02-08T01:49:58.341Z
Modified:     2025-02-08T01:49:58.341Z
File Name:   index.js

Description: description

*/
const { Command } = require('commander');
const program = new Command();
const OpenSubtitlesService = require('./open_subtitles_service');
const { version } = require('../package.json');
const chalk = require('chalk');
const readlineSync = require('readline-sync');
const fs = require('fs');

program
  .name('series-word-freq')
  .description('// TODO: Add later')
  .version(version);

program.command('login')    
    .description('Login to OpenSubtitles API')
    .action(async () => {
        try {
            if (!fs.existsSync('.env')) fs.copyFileSync('.env.example', '.env');

            let newEnvContents = fs.readFileSync('.env', 'utf8');

            if (process.env.OPENSUBTITLES_USERNAME == null) {
                console.log('Please enter your OpenSubtitles username: ');
                const username = readlineSync.prompt().replaceAll(/"/g, '\\"');
                newEnvContents = newEnvContents.replace(/OPENSUBTITLES_USERNAME=.*/g, `OPENSUBTITLES_USERNAME="${username}"`);
            } else {
                const username = process.env.OPENSUBTITLES_USERNAME;
            }

            if (process.env.OPENSUBTITLES_PASSWORD == null) {
                console.log('Please enter your OpenSubtitles password: ');
                const password = readlineSync.prompt().replaceAll(/"/g, '\\"');
                newEnvContents = newEnvContents.replace(/OPENSUBTITLES_PASSWORD=.*/g, `OPENSUBTITLES_PASSWORD="${password}"`);
            } else {
                const password = process.env.OPENSUBTITLES_PASSWORD;
            }

            if (process.env.OPENSUBTITLES_API_KEY == null) {
                console.log('Please enter your OpenSubtitles API key: ');
                const apiKey = readlineSync.prompt().replaceAll(/"/g, '\\"');
                newEnvContents = newEnvContents.replace(/OPENSUBTITLES_API_KEY=.*/g, `OPENSUBTITLES_API_KEY="${apiKey}"`);
            } else {
                const apiKey = process.env.OPENSUBTITLES_API_KEY;
            }

            fs.writeFileSync('.env', newEnvContents);

            require('dotenv').config();

            const service = new OpenSubtitlesService();
            const response = await service.login();

            if (response?.status != 200) {
                throw new Error('Login failed');
            }

            if (response?.token == null) 
                console.log(chalk.red('\nYour API Token has not been stored. Please try again.'));
            else
                console.log(chalk.green('\nYour API Token has been stored.'));

            console.log("\nUser Information:");
            console.log("  Download Limit: ", response.user.allowed_downloads);
            console.log("  User ID: ", response.user.user_id);
            console.log("  Level: ", response.user.level);
            console.log("  VIP: ", response.user.vip ? 'Yes' : 'No');

            console.log(chalk.green('\nLogin successful!'));
        } catch (error) {
            console.log(chalk.red("\n" + error.message));
        }
    });

program.command('search')
    .description('Search for a TV series')
    .argument('<show_name>', 'string to search')
    .action(async (showName, options) => {
        try {
            let requestedLanguages = null;
            if (process.env.OPENSUBTITLES_LANGUAGES) {
                try {
                    requestedLanguages = JSON.parse(process.env.OPENSUBTITLES_LANGUAGES);
                } catch (e) {
                    //
                }
            }

            const service = new OpenSubtitlesService();

            let wholeResults = await service.searchFeatures(showName);
            
            if (wholeResults == null) {
                throw new Error('Search failed');
            }

            console.log(chalk.green('\nShowing ' + wholeResults.data.length + ' results:'));

            wholeResults = wholeResults.data;
            
            // We are going to paginate the wholeResults
            // We will show one result then use readlineSync to ask the user if they want to see the next, previous, or select this one, or exit
        
            let paginatorPointer = 0;
            let inputChar = '';

            while (inputChar != 'q') {
                console.clear();

                paginator = [wholeResults[paginatorPointer]];

                paginator.forEach((result, index) => {
                    console.log(chalk.green('\nResult ' + (paginatorPointer + 1) + ':'));
                    console.log('  Title: ', result.attributes.original_title);
                    console.log('  Year: ', result.attributes.year);
                    console.log('  IMDb URL: ', 'https://www.imdb.com/title/tt' + result.attributes.imdb_id.toString().padStart(7, '0'));
                    // console.log('  Title AKA: ', chalk.white(result.attributes.title_aka.join(", ")));
                    console.log('  Title AKA: ', result.attributes.title_aka);
                    console.log('  Feature ID: ', result.attributes.feature_id);
                    console.log('  URL: ', result.attributes.url);
                    console.log('  Poster: ', result.attributes.img_url);

                    const subtitlesCounts = result.attributes.subtitles_counts;
                    const subtitlesCountsFiltered = requestedLanguages == null ? subtitlesCounts : Object.fromEntries(Object.entries(subtitlesCounts).filter(([key, value]) => requestedLanguages.indexOf(key) > -1));
                    console.log('  Subtitles Counts: ', subtitlesCountsFiltered);
                });

                console.log('\n');
                inputChar = readlineSync.keyIn('Press "n" for next, "p" for previous, "s" to select, or "q" to quit: ', {limit: 'npsq'});

                if (inputChar == 'n') {
                    paginatorPointer++;
                    if (paginatorPointer >= wholeResults.length) paginatorPointer = 0;
                } else if (inputChar == 'p') {
                    paginatorPointer--;
                    if (paginatorPointer < 0) paginatorPointer = wholeResults.length - 1;
                } else if (inputChar == 's') {
                    break;
                }
            }

            console.clear();

            if (inputChar == 'q') {
                console.log(chalk.red('\nExiting search'));
                return;
            }

            const selectedResult = wholeResults[paginatorPointer];
            console.log(chalk.green('\nSelected Result:'));
            console.log('  Title: ', selectedResult.attributes.original_title);
            console.log('  Year: ', selectedResult.attributes.year);
            console.log('  IMDb URL: ', 'https://www.imdb.com/title/tt' + selectedResult.attributes.imdb_id.toString().padStart(7, '0'));
            // console.log('  Title AKA: ', chalk.white(selectedResult.attributes.title_aka.join(", ")));
            console.log('  Title AKA: ', selectedResult.attributes.title_aka);
            console.log('  Feature ID: ', selectedResult.attributes.feature_id);
            console.log('  URL: ', selectedResult.attributes.url);
            console.log('  Poster: ', selectedResult.attributes.img_url);

            const subtitlesCounts = selectedResult.attributes.subtitles_counts;
            const subtitlesCountsFiltered = requestedLanguages == null ? subtitlesCounts : Object.fromEntries(Object.entries(subtitlesCounts).filter(([key, value]) => requestedLanguages.indexOf(key) > -1));
            console.log('  Subtitles Counts: ', subtitlesCountsFiltered);

            console.log('\n');
            console.log(chalk.green('Please run `swf extract ' + selectedResult.attributes.feature_id + '` to download the subtitles for this series.'));

        } catch (error) {
            console.log(chalk.red("\n" + error.message));
        }
    });

program.command('extract')
    .description('Extract information about subtitles for a TV series')
    .argument('<feature_id>', 'feature ID of the TV series')
    .action(async (featureId, options) => {
        try {
            const service = new OpenSubtitlesService();

            const depaginatedResults = [];

            let pageNumber = 1;
            let paginator = await service.searchSubtitles(featureId, pageNumber);

            console.log(chalk.green('\nFound ' + paginator.total_count + ' results. Sorting and caching information now...'));

            while (paginator != null) {
                paginator.data.forEach((result) => {
                    if (depaginatedResults[result.id] == null) {
                        const seriesNumber = result.attributes.feature_details.season_number;
                        const episodeNumber = result.attributes.feature_details.episode_number;

                        if (depaginatedResults[seriesNumber] == null) {
                            depaginatedResults[seriesNumber] = {};
                        }

                        if (depaginatedResults[seriesNumber][episodeNumber] != null) 
                            if (
                                depaginatedResults[seriesNumber][episodeNumber].attributes.download_count >= result.attributes.download_count ||
                                result.attributes.files.length == 0
                            )
                                return;

                        depaginatedResults[seriesNumber][episodeNumber] = result;
                    }
                });

                pageNumber++;
                if (paginator.total_pages < pageNumber) break;

                await new Promise(resolve => setTimeout(resolve, 750));

                console.log('Fetching page ' + pageNumber + '...');

                paginator = await service.searchSubtitles(featureId, pageNumber);
            }

            console.log(chalk.green('\nFinished sorting and caching information.'));

            let folderName = 'results';
            if (!fs.existsSync(folderName)) fs.mkdirSync(folderName);

            folderName += '/subtitles_' + featureId;
            if (!fs.existsSync(folderName)) fs.mkdirSync(folderName);

            // Save to a file in a new folder
            const subtitlesListFileName = folderName + '/subtitles_list.json';
            fs.writeFileSync(subtitlesListFileName, JSON.stringify(depaginatedResults));

            console.log(chalk.green('\nSubtitles list saved to ' + subtitlesListFileName));

            console.log(chalk.green('\nPlease run `swf download ' + featureId + '` to start downloading the subtitles for this series.'));
        } catch (error) {
            console.log(chalk.red("\n" + error.message));
        }
    });

program.command('download')
    .description('Download subtitles for a TV series')
    .argument('<feature_id>', 'feature ID of the TV series')
    .action(async (featureId, options) => {
        try {
            const service = new OpenSubtitlesService();

            let folderName = 'results';
            if (!fs.existsSync(folderName)) fs.mkdirSync(folderName);

            folderName += '/subtitles_' + featureId;
            if (!fs.existsSync(folderName)) {
                console.log(chalk.red('\nPlease run `swf extract ' + featureId + '` first to cache the subtitles list.'));
                return;
            }

            const subtitlesListFileName = folderName + '/subtitles_list.json';
            const subtitlesList = Object.fromEntries(Object.entries({...JSON.parse(fs.readFileSync(subtitlesListFileName, 'utf8'))}).filter(([k, v]) => v != null));

            let subtitlesCount = 0;
            loop1: for (const seriesNumber in subtitlesList) {

                console.log('Series ' + seriesNumber + ':');

                loop2: for (const episodeNumber in subtitlesList[seriesNumber]) {

                    console.log('  Episode ' + episodeNumber + ':');

                    const filename = folderName + '/' + seriesNumber + 'x' + episodeNumber + '.srt';
                    if (fs.existsSync(filename)) {
                        console.log('    Subtitles already downloaded.');
                        continue;
                    }

                    const subtitles = subtitlesList[seriesNumber][episodeNumber];
                    
                    console.log('    Downloading subtitles...');

                    const fileId = subtitles.attributes.files[0].file_id;
                    const downloadSuccessful =await service.downloadSubtitle(fileId, filename);

                    if (downloadSuccessful === false) break loop1;

                    await new Promise(resolve => setTimeout(resolve, 750));
                
                    subtitlesCount++;
                }
            }

            console.log(chalk.green('\nDownloaded ' + subtitlesCount + ' subtitles.'));

            console.log(chalk.green('\nPlease run `swf analyse ' + featureId + '` to start analyzing the subtitles for this series.'));
        } catch (error) {
            console.log(chalk.red("\n" + error.message));
        }
    });



program.parse();