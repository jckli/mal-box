import config from "./config.js";
import { cutString } from "./utils.js";
import fetch from 'node-fetch';
import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
    auth: `token ${config.githubToken}`,
  });  

interface AnimeJson {
    "title": string;
    "watching_status": number;
    "score": number;
}

async function check(func: Function) {
    if (!config.gistId || !config.githubToken || !config.malUsername) {
        throw new Error("Please check your environment variables, as one or more of them are missing.");
    }
    await func();
}

async function getAnimeList() { 
    const jikanurl = `https://api.jikan.moe/v3/user/${config.malUsername}/animelist/all?order_by=last_updated&sort=desc`;
    const response = await fetch(jikanurl);
    const json = await response.json();
    const animeList = json["anime"] as AnimeJson[];
    const slicedList = animeList.slice(0, 3);
    return slicedList;
}

async function parseAnimeList() {
    const animeList = await getAnimeList();
    let fullTitle = "";
    animeList.forEach(anime => {
        const rawStatus = anime.watching_status;
        const title = cutString(anime.title, 30);
        const score = anime.score;

        let status = "None";
        if (rawStatus == 1) {
            status = "Watching";
        }
        else if (rawStatus == 2) {
            status = "Completed";
        }
        else if (rawStatus == 3) {
            status = "Put on Hold";
        }
        else if (rawStatus == 4) {
            status = "Dropped";
        }
        else if (rawStatus == 6) {
            status = "Plan to Watch";
        }
        fullTitle += `${status} ${title} - ${score}/10\n`;
    });
    console.log(fullTitle);
    let gist = [];
    try {
        gist = await octokit.gists.get({
            gist_id: config.gistId
        });
    } catch (error) {
        console.error(`There was a problem getting your Gist: ${error}`);
    }
    try {
        const filename = Object.keys(gist["data"]["files"])[0]
        await octokit.gists.update({
            gist_id: config.gistId,
            description: "🌸 MyAnimeList Anime Activity 🌸",
            files: {
                "Made by mal-box": {
                    filename: `🌸 MAL Anime Activity 🌸`,
                    content: { content: fullTitle }
                }
            }
        });
    } catch (error) {
        console.error(`Unable to update gist: ${error}`)
    }
}

async function updateGist() {
    const data = await parseAnimeList();
    const response = await fetch(`https://api.github.com/gists/${config.gistId}`, {
        body: JSON.stringify(data),
        method: "POST",
        headers: {Authorization: `token ${config.githubToken}`, Accept: "application/json",},
    });
    const status = await response.status;
    console.log(status);
    if (status != 200) {
        throw new Error("Something went wrong while updating the Gist.");
    }
    else {
        console.log("Gist updated successfully.");
    }
}

(async () => {
    await check(updateGist);
})();