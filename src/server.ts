import express from "express"
import * as afs from "fs/promises"
import { IncomingMessage, Server, ServerResponse } from "http"
import { WebSocket, WebSocketServer } from "ws"

export function createReloadHtmlCode(
    idEndpoint: string,
) {
    const location: any = undefined as any

    const reloadHtmlScript = async () => {
        const resp = await fetch(".${ENDPOINT_ID}")

        const body = await resp.text()
        const id = Number(body)
        if (isNaN(id)) {
            return console.error("@noblemajo/serve id is not a number")
        }

        console.info("Current @noblemajo/serve id: " + id)

        while (true) {
            try {
                await new Promise<void>((res, rej) => {
                    const ws = new WebSocket(".")
                    ws.on("close", () => {
                        location.reload()
                    })
                })
            } catch (err) {
                console.log(
                    "Error in @noblemajo/serve loop:\n",
                    err
                )
            }
        }

    }

    const reloadHtmlCode = ("" + reloadHtmlScript)
        .split("${ENDPOINT_ID}")
        .join(idEndpoint)

    return "<script>\n(" +
        reloadHtmlCode +
        ")()\n</script>"
}

export function createExpress(
    targetDir: string,
    reloadHtmlCode: string,
    idEndpoint: string,
    getReloadId: () => number
) {
    const app = express()

    app.get(idEndpoint, (req, res) => {
        res.status(200)
        res.send("" + getReloadId())
    })

    app.use(async (req, res, next) => {
        let path = req.path
        if (path.endsWith(".html") || path.endsWith("/")) {
            if (path.endsWith("/")) {
                path += "index.html"
            }

            try {
                const data = await afs.readFile(targetDir + path, "utf8")
                res.status(200)
                res.send(reloadHtmlCode + data.toString())
            } catch (err) {
                res.status(400)
                res.send("Cant read html-file from '" + path + "'")
            }

            return
        }

        next()
    })

    app.use(express.static(targetDir))

    return app
}

export function createWebSocketServer(
    httpServer: Server<typeof IncomingMessage, typeof ServerResponse>,
    addTriggerFunction: (
        triggerFunction: () => void
    ) => void
) {
    const wsServer = new WebSocketServer({ noServer: true })
    wsServer.on("connection", (ws, req) => {
        addTriggerFunction(() => {
            if (
                ws.readyState === ws.OPEN ||
                ws.readyState === ws.CONNECTING
            ) {
                ws.close()
            }
        })
    })

    httpServer.on('upgrade', (req, socket, head) => {
        wsServer.handleUpgrade(req, socket, head, (ws) => {
            wsServer.emit('connection', ws, req)
        })
    })

    return wsServer
}