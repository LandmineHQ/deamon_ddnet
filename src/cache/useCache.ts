import { readFile, writeFile } from "fs/promises"
import { MAPPERS, SKINS, TEEDATA } from "./Config"
import { Cache } from "./type"
var debug = require('debug')('deamon-ddnet:server')

const cache = {} as Cache

function initCache() {
    readFile(MAPPERS.FILE_PATH, { encoding: "utf8" }).then(res => {
        cache.mappers = JSON.parse(res)
    }).catch(err => console.error("has no " + MAPPERS.FILE_PATH))
    readFile(SKINS.FILE_PATH, { encoding: "utf8" }).then(res => {
        cache.skins = JSON.parse(res)
    }).catch(err => console.error("has no " + SKINS.FILE_PATH))

    cache.teedata = {
        author: [],
        skins: [],
    } as unknown as Cache["teedata"]
    readFile(TEEDATA.FILE_PATH.SKIN, { encoding: "utf8" }).then(res => {
        cache.teedata.skins = JSON.parse(res)
    }).catch(err => console.error("has no " + TEEDATA.FILE_PATH.SKIN))
    readFile(TEEDATA.FILE_PATH.AUTHOR, { encoding: "utf8" }).then(res => {
        cache.teedata.author = JSON.parse(res)
    }).catch(err => console.error("has no " + TEEDATA.FILE_PATH.AUTHOR))
}

function saveCache(key: keyof Cache) {
    switch (key) {
        case "mappers":
            return writeFile(MAPPERS.FILE_PATH, JSON.stringify(cache.mappers), { encoding: "utf8" }).catch(err => debug(err))
            break
        case "skins":
            return writeFile(SKINS.FILE_PATH, JSON.stringify(cache.skins), { encoding: "utf8" }).catch(err => debug(err))
            break
        case "teedata":
            const promise1 = writeFile(TEEDATA.FILE_PATH.SKIN, JSON.stringify(cache.teedata.skins), { encoding: "utf8" }).catch(err => debug(err))
            const promise2 = writeFile(TEEDATA.FILE_PATH.AUTHOR, JSON.stringify(cache.teedata.author), { encoding: "utf8" }).catch(err => debug(err))
            return [promise1, promise2]
            break
    }
    return null
}

async function storeAllCache() {
    const promise1 = saveCache("mappers")
    const promise2 = saveCache("skins")
    // @ts-ignore
    const [promise3, promise4] = saveCache("teedata")
    await promise1
    await promise2
    await promise3
    await promise4
}

export default {
    cache,
    initCache,
    storeCache: saveCache,
    storeAllCache: storeAllCache
}