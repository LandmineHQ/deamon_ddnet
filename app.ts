import express from "express"
import path from "path"
import cookieParser from "cookie-parser"
import logger from "morgan"

import indexRouter from "./routes/index"
import useCache from "./src/cache/useCache"

var app = express()

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())

app.use('/', indexRouter)
app.use(express.static(path.join(__dirname, 'public')))
useCache.initCache()
import('exit-hook').then((res) => {
    res.asyncExitHook(exit, { wait: 5000 })
})

export default app

async function exit() {
    console.log("exiting daemon of ddnet web...")
    await useCache.storeAllCache()
    console.log("daemon of ddnet web is exited.")
}