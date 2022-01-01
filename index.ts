import config from "./config.js";
import { cutString } from "./utils.js";
import fetch from 'node-fetch';

const jikanurl = `https://api.jikan.moe/v3/user/${config.malUsername}/animelist/all?order_by=last_updated&sort=desc`;

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
    return {
        description: "🌸 MyAnimeList Anime Activity 🌸",
        files: {
            "🌸 MAL Anime Activity 🌸": {
                filename: `🌸 MAL Anime Activity 🌸`,
                content: { content: fullTitle }
            }
        },
    }
}

async function updateGist() {
    const data = await parseAnimeList();
    console.log(data);
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