import * as Database from "./libs/database";
import { parseRequests, listenEvents } from "./libs/web3";
import { ipfs, getWeb3Nodes, getCacheNodes, add, parseCache } from "./libs/ipfs"
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import request from 'request'
import multer from 'multer'

const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

const app = express();
app.use(cors());
app.use(helmet());

// Init mongo database
const db = new Database.default.Mongo()
db.createRequestsIndex()

// Main function
async function init() {
  // Adding web3 nodes to swarm
  // console.log("Getting nodes from repo..")
  // const w3nodes = await getWeb3Nodes()
  // console.log('Found ' + w3nodes.length + ' Web3.Storage nodes.')
  // for (let k in w3nodes) {
  //   try {
  //     console.log("Adding " + w3nodes[k] + " to swarm..")
  //     await ipfs("post", "/swarm/connect?arg=" + w3nodes[k])
  //   } catch (e) {
  //     console.log("Can't add node to swarm..")
  //   }
  // }
  // Adding cache nodes
  // const cachnodes = await getCacheNodes()
  // console.log('Found ' + cachnodes.length + ' cache nodes.')
  // for (let k in cachnodes) {
  //   try {
  //     console.log("Adding " + cachnodes[k] + " to swarm..")
  //     await ipfs("post", "/swarm/connect?arg=" + cachnodes[k])
  //   } catch (e) {
  //     console.log("Can't add node to swarm..")
  //   }
  // }
  // Add service to local node
  // try {
  //   console.log("Adding Web3.Storage as remote pinning provider...")
  //   await ipfs("post", "/pin/remote/service/add?arg=web3_storage&arg=https://api.web3.storage&arg=" + process.env.WEB3_STORAGE_KEY)
  // } catch (e) {
  //   console.log("Remote pinning setted up yet.")
  // }
  // Adding listeners to on-chain contract
  // listenEvents()
  // Parse past bridges
  // parseRequests()
  // Parse IPFs cache
  parseCache()
}
init()

// Public endpoints
app.get("/ipfs/:hash", async function (req, res) {
  req.pipe(request("http://localhost:8080/ipfs/" + req.params.hash)).pipe(res);
})

// Upload endpoint
app.post("/upload", upload.single('file'), async function (req, res) {
  if (req.body.address !== undefined) {
    const cid = await add(req.file.buffer, req.file.filename, true)
    if (cid !== false) {
      const checkDB = await db.find('cache', { cid: cid })
      if (checkDB === null || (checkDB !== null && checkDB.expired !== undefined && checkDB.expired === true)) {
        const added = await add(req.file.buffer, req.file.filename)
        await db.insert('cache', {
          cid: cid,
          address: req.body.address,
          timestamp: new Date().getTime(),
          expired: false
        })
        res.send({ cid: added, error: false })
      } else {
        res.send({ message: "CID already pinned.", cid: cid, error: false })
      }
    } else {
      res.send({ message: "Can't add on IPFS, please retry.", error: true })
    }
  } else {
    res.send({ message: "Malformed request", error: true })
  }
})

app.get("/deals/:address", async function (req, res) {
  const db = new Database.default.Mongo()
  const deals = await db.find('requests', { owner: req.params.address }, { timestamp_start: 1 })
  res.send(deals)
})

app.listen(3000, () => {
  console.log(`Web3Bounty API running.`);
});
