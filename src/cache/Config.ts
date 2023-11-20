import { join } from "path"

const MAPPERS = {
    FILE_PATH: join(__dirname, "mappers.json")
}
const SKINS = {
    FILE_PATH: join(__dirname, 'skins.json')
}

const TEEDATA = {
    FILE_PATH: {
        SKIN: join(__dirname, "teedata_skins.json"),
        AUTHOR: join(__dirname, "teedata_authors.json")
    }
}

export {
    MAPPERS,
    SKINS,
    TEEDATA
}