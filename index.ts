import config from "./config";

async function getAnimeList() { 
    const url = `https://api.jikan.moe/v3/user/${config.malUsername}/animelist/all?order_by=last_updated&sort=desc`;
    const response = await fetch(url);
    const json = await response.json();
    const animeList = json.anime;
    const slicedList = animeList.slice(0, 3);
    return slicedList;
}