import { createHelia } from 'helia'
import { createLibp2p } from 'libp2p'
import { identify } from '@libp2p/identify'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { webSockets } from '@libp2p/websockets'
import { webRTC } from '@libp2p/webrtc'
import { all } from '@libp2p/websockets/filters'
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { createOrbitDB } from '@orbitdb/core'
import { multiaddr } from '@multiformats/multiaddr'
import { WebRTC } from '@multiformats/multiaddr-matcher'
import './style.css'
import { bootstrap } from '@libp2p/bootstrap'
import { LevelBlockstore } from 'blockstore-level'

// A lot of this configuration is covered in detail in 
// https://docs.libp2p.io/guides/getting-started/webrtc/.

const options = {
  addresses: {
    // Listen for inbound webRTC connections.
    listen: ['/webrtc', '/p2p-circuit']
  },
  // transports are used to move data over the network. You can learn more 
  // about Libp2p transports at 
  // https://docs.libp2p.io/concepts/transports/overview/.
  transports: [
    // The websockets transport is used by browser peers when communicating
    // with the relay.
    // Filtering being set to "all" is a bit misleading. It actually means that // the browser will try to communicate over the websockets transport with 
    // any websockets address, even an insecure one.
    // In our example, websockets would facilitate a connection between browsers A and B like so:
    // - browser A dials the relay and makes a reservation.
    // - Once the reservation is made, the relay will return a number of
    // addresses which it will be listening on on behalf of browser A. 
    // - When browser B would like to connect to browser A, the relay will use 
    // this "reservation" to establish an initial connection between A and B.
    webSockets({
      filter: all
    }),
    // webRTC transport will be used for browser-to-browser communication.
    // You can learn more about the intricacies of webrtc here 
    // https://docs.libp2p.io/guides/getting-started/webrtc/.
    webRTC(),
    // Establishes the initial connection between peers via a relay.
    // Required by WebRTC. You can learn more about circuit relays at 
    // https://docs.libp2p.io/guides/getting-started/webrtc/#step-5-make-the-browser-dialable-with-circuit-relay
    circuitRelayTransport()
  ],
  connectionEncrypters: [
    noise()
  ],
  streamMuxers: [
    yamux()
  ],
  // The gater will stop certain addresses from being dialled.
  connectionGater: {
    // Setting this to false allows private address connections for local
    // testing (E.g. localhost).
    denyDialMultiaddr: () => false
  },
  services: {
    identify: identify(),
    pubsub: gossipsub({
      allowPublishToZeroTopicPeers: true,
      emitSelf: true
    })
  }
}

let orbitdb

const waitFor = async (valueA, toBeValueB, pollInterval = 100) => {
  return new Promise((resolve) => {
    const interval = setInterval(async () => {
      if (await valueA() === await toBeValueB()) {
        clearInterval(interval)
        resolve()
      }
    }, pollInterval)
  })
}

const init = async () => {
  const id = "orbitdb-browser-example"
  
  const blockstore = new LevelBlockstore(`/ipfs/${id}`)

  const libp2p = await createLibp2p({ ...options })
  const ipfs = await createHelia({ libp2p, blockstore })
  orbitdb = await createOrbitDB({ id, ipfs })
  
  document.getElementById('peerId').innerText = orbitdb.ipfs.libp2p.peerId.toString()
}

const discover = async () => {
  const relayId = '12D3KooWAJjbRkp8FPF5MKgMU53aUTxWkqvDrs4zc1VMbwRwfsbE'

  await orbitdb.ipfs.libp2p.dial(multiaddr(`/ip4/127.0.0.1/tcp/12345/ws/p2p/${relayId}`))

  let addresses = []

  await waitFor(() => {
      console.log(orbitdb.ipfs.libp2p.getMultiaddrs())
    addresses = orbitdb.ipfs.libp2p.getMultiaddrs().filter(ma => WebRTC.matches(ma))
    return addresses.length > 0
  }, () => true)

  for await (const a of addresses) {
    document.getElementById('peerAddresses').innerHTML += a.toString() + '<br/>'
  }
}

window.addEventListener('load', async (event) => {  
  await init()
})

window.addEventListener('unload', async (event) => {  
  await orbitdb.stop()
  await ipfs.stop()
})

document.getElementById('discover').addEventListener('click', async () => {
  await discover()
})

document.getElementById('createDB').addEventListener('click', async () => {
  const db = await orbitdb.open('my-db', { type: "documents" })
  await db.put({ _id: 'hello world', value: 'hello world' })
  console.log(await db.all())
  document.getElementById('db').innerText = db.address
})

document.getElementById('fetchDB').addEventListener('click', async () => {
  const libp2pAddress = document.getElementById('libp2pAddress').value
  const dbAddress = document.getElementById('dbAddress').value

  orbitdb.ipfs.libp2p.dial(multiaddr(libp2pAddress))

  const db = await orbitdb.open(dbAddress)
  document.getElementById('fetched').innerText = db.address

  let replicated = false

  const onJoin = async (peerId, heads) => {
    console.log('joined')
    replicated = true
  }
  
  db.events.on('join', onJoin)

  await waitFor(() => replicated, () => true)

  for await (const r of db.iterator()) {
    document.getElementById('records').innerText = r.value
  }
})
