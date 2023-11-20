import express from "express"
import path from "path"
import cookieParser from "cookie-parser"
import logger from "morgan"

import indexRouter from "./routes/index"

var app = express()

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())

app.use('/', indexRouter)
app.use(express.static(path.join(__dirname, 'public')))

export default app