import config from "./config.js";
import { cutString } from "./utils.js";
import fetch from 'node-fetch';
import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
    auth: `token ${config.githubToken}`,
  });  

/** Maybe instead of score, do episodes watched/chapters read */
interface AnimeJson {
    "title": string;
    "watching_status": number;
    "score": number;
}
interface MangaJson {
    "title": string;
    "reading_status": number;
    "score": number;
}

async function check(func: Function) {
    if (!config.gistId || !config.githubToken || !config.malUsername || !config.mode) {
        throw new Error("Please check your environment variables, as one or more of them are missing.");
    }
    if (!((config.mode == "anime") || (config.mode == "manga"))) {
        throw new Error("Check the MAL_MODE environmental variable. It should be set to either exactly 'anime' or exactly 'manga'.");
    }
    await func();
}

async function getList() { 
    const jikanurl = `https://api.jikan.moe/v4/users/${config.malUsername}/${config.mode}list/all?order_by=last_updated&sort=desc`
    /**const jikanurl = `https://api.jikan.moe/v3/user/${config.malUsername}/${config.mode}list/all?order_by=last_updated&sort=desc`; */
    const response = await fetch(jikanurl);
    const data = await response.json();
    const json = await JSON.parse(JSON.stringify(data));
    if (config.mode == "anime") {
        const animeList = json.data as AnimeJson[];
        const slicedList = animeList.slice(0, 5);
        return slicedList;
    } else if (config.mode == "manga") {
        const mangaList = json.data as MangaJson[];
        const slicedList = mangaList.slice(0, 5);
        return slicedList;
    } else {
        throw new Error("Something went wrong. Check your MAL_MODE environment variable.");
    }
}

async function parseAnimeList() {
    const animeList = await getList();
    let fullTitle = "";
    animeList.forEach(anime => {
        const rawStatus = anime.watching_status;
        const rawScore = anime.score;
        let status = "None";
        let cutAt = 0;
        if (rawStatus == 1) {
            status = "Watching";
            cutAt = 40;
        }
        else if (rawStatus == 2) {
            status = "Completed";
            cutAt = 39;
        }
        else if (rawStatus == 3) {
            status = "Put on Hold";
            cutAt = 37;
        }
        else if (rawStatus == 4) {
            status = "Dropped";
            cutAt = 41;
        }
        else if (rawStatus == 6) {
            status = "Planning to Watch";
            cutAt = 31;
        }
        let score;
        if (rawScore == 0) {
            score = "Unrated";
            cutAt = cutAt;
        } else {
            score =`⭐${rawScore}/10`;
        }
        const title = cutString(anime.anime.title, cutAt);
        fullTitle += `${status} ${title} - ${score}\n`;
    });
    console.log(fullTitle);
    return fullTitle
}

async function parseMangaList() {
    const mangaList = await getList();
    let fullTitle = "";
    mangaList.forEach(manga => {
        const rawStatus = manga.reading_status;
        const rawScore = manga.score;
        let status = "None";
        let cutAt = 0;
        if (rawStatus == 1) {
            status = "Reading";
            cutAt = 41;
        }
        else if (rawStatus == 2) {
            status = "Completed";
            cutAt = 39;
        }
        else if (rawStatus == 3) {
            status = "Put on Hold";
            cutAt = 37;
        }
        else if (rawStatus == 4) {
            status = "Dropped";
            cutAt = 41;
        }
        else if (rawStatus == 6) {
            status = "Planning to Read";
            cutAt = 32;
        }
        let score;
        if (rawScore == 0) {
            score = "Unrated";
            cutAt = cutAt;
        } else {
            score =`⭐${rawScore}/10`;
        }
        const title = cutString(manga.manga.title, cutAt);
        fullTitle += `${status} ${title} - ${score}\n`;
    });
    console.log(fullTitle);
    return fullTitle
}

async function updateGist() {
    let data;
    let name;
    if (config.mode == "anime") {
        data = await parseAnimeList();
        name = "Anime";
    } else if (config.mode == "manga") {
        data = await parseMangaList();
        name = "Manga";
    } else {
        throw new Error("Something went wrong. Check your MAL_MODE environment variable.");
    }

    let gist
    try {
        gist = await octokit.gists.get({
            gist_id: config.gistId
        });
    } catch (error) {
        console.error(`There was a problem getting your Gist: ${error}`);
    }

    try {
        const filename = Object.keys(gist.data.files)[0]
        await octokit.gists.update({
            gist_id: config.gistId,
            description: `🌸 MyAnimeList ${name} Activity 🌸`,
            public: true,
            files: {
                [filename]: {
                    filename: `${name} List - Powered by Mal-Box`,
                    content: data
                }
            }
        });
    } catch (error) {
        console.error(`Unable to update gist: ${error}`)
    }
}

(async () => {
    await check(updateGist);
})();