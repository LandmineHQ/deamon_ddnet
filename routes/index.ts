import { readFileSync, writeFileSync } from "fs"
import appInfo from "../package.json"
import express from "express"
import { error } from "console"
import axios from "axios"
import { MAPPERS, SKINS, TEEDATA } from "../src/cache/Config"
import useCache from "../src/cache/useCache"
import { MappersData, TeeData_SKIN } from "../src/cache/type"
const debug = require('debug')('deamon-ddnet:server')

const router = express.Router()

router.get('/version', (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.send(`version ${appInfo.version}`)

  // process get end
  if (req.query.exit !== undefined) {
    import('exit-hook').then(res => {
      res.gracefulExit()
    })
  }
})

router.get('/teedata/skinSource', async (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*")
  if (typeof req.query.name !== "string") return
  const name = req.query.name
  let item = getCacheTeeData(name)
  if (item) {
    res.send(item.file_path)
    return
  }
  console.log("no cache file found, now fetching teedata", name)
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
  let mappers
  // read cache
  mappers = useCache.cache.mappers
  if (!mappers) res.redirect('/freshMappers')
  res.send(mappers)
})

router.get('/freshMappers', async (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  await fetch("https://ddnet.org/mappers")
    .then(async (response) => {
      await response.text().then((responseText) => {
        useCache.cache.mappers = compilerHTML2Mappers(responseText)
      })
    })
    .catch(err => console.log(error))
  res.redirect("/mappers")
})

// 使用此函数缓存skins且完成跨域
router.get('/skins', async (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  let skins = useCache.cache.skins
  if (skins) {
    res.send(skins)
    return
  }
  res.redirect('/freshSkins')
})

router.get('/freshSkins', async (req, res, next) => {
  await fetch("https://ddnet.org/skins/skin/skins.json").then(async (response) => {
    await response.text().then((responseJSON) => {
      useCache.cache.skins = JSON.parse(responseJSON)
    })
  }).catch(err => console.log(err))
  res.redirect('/skins')
})

export default router

// =================================================================

/**
 * 将html字符串编译为mappers.json
 * @param html 
 * @returns 
 */
function compilerHTML2Mappers(html: string): MappersData {
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
  if (!authorsMatch) return obj
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
  return obj
}

/**
 * 本地缓存命中
 * @param name - 皮肤名
 * @returns 皮肤路径
 */
function getCacheTeeData(name: string): TeeData_SKIN | null {
  let skins = useCache.cache.teedata.skins
  if (!skins) return null
  for (let item of skins) {
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
  let skins = useCache.cache.teedata.skins
  // 将item添加进缓存
  skins.unshift(item)
  return item
}