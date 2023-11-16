import { readFileSync, writeFileSync } from "fs";
import appInfo from "../package.json"
import { join } from "path";
import express from "express";
let debug = require('debug')('deamon-ddnet:server');

let router = express.Router();
let MAPPERS = {
  PATH: join(__dirname, "mappers.json")
}

router.get('/version', (req, res, next) => {
  res.send(`version ${appInfo.version}`)
});

router.get('/mappers', (req, res, next) => {
  let mapperHTML;
  try {
    mapperHTML = readFileSync(MAPPERS.PATH, { encoding: 'utf8' });
  } catch (error) {
    res.redirect('/freshMappers')
    return
  }
  res.sendFile(MAPPERS.PATH)
})

router.get('/freshMappers', async (req, res, next) => {
  await fetch("https://ddnet.org/mappers")
    .then(async (response) => {
      await response.text().then((responseText) => {
        writeFileSync(MAPPERS.PATH, compiler(responseText), { encoding: 'utf8' })
      })
    })
  res.redirect("/mappers")
})

module.exports = router;

// 定义一个函数，用来将html字符串编译为json
function compiler(html: string): string {
  // 定义一个接口，用来描述对象文件的结构
  interface ObjectFile {
    total: number
    authors: {
      [name: string]: {
        total?: number
        type?: { [key: string]: number }
      }
    }
  }
  // 创建一个空的对象文件
  const obj: ObjectFile = {
    total: 0,
    authors: {},
  };

  // 使用正则表达式，匹配html字符串中的总数
  let totalReg = /(\d+) mappers total:/;
  let totalMatch = html.match(totalReg);
  if (totalMatch) {
    // 将总数转换为数字，并赋值给对象文件的total属性
    obj.total = Number(totalMatch[1]);
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
  return JSON.stringify(obj);
}