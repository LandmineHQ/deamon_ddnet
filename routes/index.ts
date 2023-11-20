import { readFileSync, writeFileSync } from "fs"
import appInfo from "../package.json"
import express from "express"
import { error } from "console"
import axios from "axios"
import { MAPPERS, SKINS, TEEDATA } from "../src/cache/Config"
const debug = require('debug')('deamon-ddnet:server')

const router = express.Router()

router.get('/version', (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.send(`version ${appInfo.version}`)
})

router.get('/teedata/skinSource', async (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*")
  if (typeof req.query.name !== "string") return
  const name = req.query.name
  let item = getCacheTeeData(name)
  if (item !== null) {
    res.send(item.file_path)
    return
  }

  const url = new URL("https://teedata.net/api/skin/read/name/")
  url.pathname += name
  await axios.get(url.toString()).then(response => {
    let skin = addCacheTeeData(response.data.result)
    res.send(skin.file_path)
    return
  }).catch(err => {
    console.log("/teedata/skin has no", name)
    res.sendStatus(404)
    return
  })
})

router.get('/teedata/author', async (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (typeof req.query.name !== "string") return
  const name = req.query.name
  if (!name) {
    res.sendStatus(400)
    return
  }
  // it will be terrible if try to cache the author data, so i decided not to cache it.
  // just by the teedata api affords.
  const url = new URL("https://teedata.net/api/user/read/name/")
  url.pathname += name.replace(/[\u4e00-\u9fa5]/g, '') // remove chinese characters
  await axios.get(url.toString()).then(response => {
    res.send(response.data.result)
    return
  }).catch(err => {
    console.log("/teedata/author has no", name)
    res.sendStatus(404)
    return
  })
})

router.get('/mappers', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  let mapperHTML
  try {
    mapperHTML = readFileSync(MAPPERS.FILE_PATH, { encoding: 'utf8' })
  } catch (error) {
    res.redirect('/freshMappers')
  }
  res.sendFile(MAPPERS.FILE_PATH)
})

router.get('/freshMappers', async (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  await fetch("https://ddnet.org/mappers")
    .then(async (response) => {
      await response.text().then((responseText) => {
        writeFileSync(MAPPERS.FILE_PATH, compilerHTML2Mappers(responseText), { encoding: 'utf8' })
      })
    })
    .catch(err => console.log(error))
  res.redirect("/mappers")
})

// 使用此函数缓存skins且完成跨域
router.get('/skins', async (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  let skins
  try {
    skins = readFileSync(SKINS.FILE_PATH, { encoding: 'utf8' })
  } catch (error) {
    res.redirect('/freshSkins')
  }
  res.sendFile(SKINS.FILE_PATH)
})

router.get('/freshSkins', async (req, res, next) => {
  await fetch("https://ddnet.org/skins/skin/skins.json").then(async (response) => {
    await response.json().then((responseJSON) => {
      writeFileSync(SKINS.FILE_PATH, JSON.stringify(responseJSON), { encoding: 'utf8' })
    })
  })
    .catch(err => console.log(err))
  res.redirect('/skins')
})

export default router

// =================================================================

/**
 * 将html字符串编译为mappers.json
 * @param html 
 * @returns 
 */
function compilerHTML2Mappers(html: string): string {
  // 创建一个空的对象文件
  const obj: MappersData = {
    total: 0,
    authors: {},
  }

  // 使用正则表达式，匹配html字符串中的总数
  let totalReg = /(\d+) mappers total:/
  let totalMatch = html.match(totalReg)
  if (totalMatch) {
    // 将总数转换为数字，并赋值给对象文件的total属性
    obj.total = Number(totalMatch[1])
  }

  // 使用正则表达式，匹配html字符串中的作者和地图信息
  let authorsReg = /<a href="\/mappers\/[\s\S]+?<\/p>/g
  let authorsMatch = html.match(authorsReg)
  if (!authorsMatch) return JSON.stringify(obj)
  for (let authorElement of authorsMatch) {
    // 匹配信息的<p>元素
    let elementRegExecArray =
      /&#x202d;(.*?)&#x202d;/.exec(authorElement)
    let name = "nope"
    if (elementRegExecArray) name = elementRegExecArray[1].trim()
    let mapsRegExecArray = /<\/a>:[\s\S]*?(\d)[\s\S]*?\((.*?)\)/.exec(authorElement)

    if (!mapsRegExecArray) continue
    obj.authors[name] = {
      total: parseInt(mapsRegExecArray[1]),
      type: {}
    }
    // 匹配出地图类型与数量
    let typesMatchArray = mapsRegExecArray[2]
      .replaceAll(" ", "")
      .matchAll(/[^,][\s\S]*?\d/g)
    for (let key of typesMatchArray) {
      // 地图类型
      let type = /([\s\S]*):/.exec(key[0])
      let number = /:(\d)/.exec(key[0])
      if (!type || !number) continue
      // @ts-ignore
      obj.authors[name].type[type[1]] = parseInt(number[1])
    }
  }

  // 返回对象文件
  return JSON.stringify(obj)
}

/**
 * 本地缓存命中
 * @param name - 皮肤名
 * @returns 皮肤路径
 */
function getCacheTeeData(name: string): TeeData_SKIN | null {
  let teedata: TeeData_SKIN[] = [];
  try {
    teedata = JSON.parse(readFileSync(TEEDATA.FILE_PATH.SKIN, { encoding: "utf8" }))
  } catch (error) {
    console.log("WARNNING: has none teedata cache.")
  }
  for (let item of teedata) {
    if (item.name !== name) continue
    // 命中缓存
    return item
    break
  }
  return null
}

/**
 * 缓存新增
 * @param newTeeData -
 * @param name - 皮肤名，忽略大小写
 * @returns 
 */
function addCacheTeeData(item: TeeData_SKIN): TeeData_SKIN {
  // 获取缓存文件
  let teedata: TeeData_SKIN[];
  try {
    teedata = JSON.parse(readFileSync(TEEDATA.FILE_PATH.SKIN, { encoding: "utf8" }))
  } catch (error) {
    console.log("has none cache of teedata", error)
    teedata = []
  }
  // 将item添加进缓存
  teedata.unshift(item)

  // 保存缓存
  try {
    writeFileSync(TEEDATA.FILE_PATH.SKIN, JSON.stringify(teedata), { encoding: "utf8" })
  } catch (error) {
    console.log(error);
  }
  return item
}