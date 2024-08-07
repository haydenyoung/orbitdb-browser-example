# OrbitDB Browser Example

The single most requested use case by developers looking to implement OrbitDB is, "How do I replicate a database across browser peers".

This project aims to answer this with a basic browser-to-browser replication example. Additionally, this project will aim to demystify some of the networking terms used by LibP2P.

## Overview

We will launch two browser peers, A and B along with a 3rd "relay" peer. The relay will be queried by peer A to determine A's WebRTC addresses.

node A will create a database and add a record, "hello world".

node A will determine its network address and will make this available for connections from node B.

node B will fetch the database created by node A and replicate the record "hello world".

## Prerequisites

You will require git and npm to set up this project and run the examples.

## Setting up the project

Clone this project and install required packages.

```
git clone https://github.com/haydenyoung/orbitdb-browser-example.git
cd orbitdb-browser-example
npm i
```

You will also need a relay. For this example, you can use the relay bundled with the @orbitdb/core package. Before running the relay, you will need to clone the OrbitDB repository and install the required packages:

```
git clone https://github.com/orbitdb/orbitdb.git
cd orbitdb
npm i
``` 

## Running the project

**Caveats**
---
Due to security constraints, you will either need to clone and run the orbitdb-browser-example in two separate browsers on the same machine (localhost), or clone and run orbitdb-browser-example on two separate machines which are located on the same local network.

This example has only been tested on localhost. Running on a LAN or remotely over the Internet is not guaranteed to work.

This example has been tested on Firefox, Chromium and Brave.
---

Now you are ready to run the replication example across two browsers.

Open a terminal window and start the relay:

```bash
cd orbitdb
npm run webrtc
```

Output should look something like:

```
> @orbitdb/core@2.2.0 webrtc
> node ./test/utils/relay.js

12D3KooWAJjbRkp8FPF5MKgMU53aUTxWkqvDrs4zc1VMbwRwfsbE
p2p addr:  [
  '/ip4/127.0.0.1/tcp/12345/ws/p2p/12D3KooWAJjbRkp8FPF5MKgMU53aUTxWkqvDrs4zc1VMbwRwfsbE',
  '/ip4/192.168.5.51/tcp/12345/ws/p2p/12D3KooWAJjbRkp8FPF5MKgMU53aUTxWkqvDrs4zc1VMbwRwfsbE',
  '/ip4/100.64.100.6/tcp/12345/ws/p2p/12D3KooWAJjbRkp8FPF5MKgMU53aUTxWkqvDrs4zc1VMbwRwfsbE'
]
```

The relay will output its peer id and the addresses it is listening on. The peer id and addresses are deterministic, I.e. they should not changes across restarts.

Open up another terminal window and start up the browser application:

```bash
cd orbitdb
npm run dev
```

The project is using Vite to build the web application. Once ready, you should see something like:

```bash
> orbitdb-browser-example@0.0.0 dev
> vite

  VITE v5.3.4  ready in 198 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

### Launching browser A, discovering A's webrtc address, and creating a database

Open up a browser window. Navigate to http://localhost:5173/. You will be presented with a basic user interface with various actions which you can enable.

When the web application is loaded, it will immediately set up an instance of OrbitDB. However, you will have to query the relay to determine the addresses the browser peer can be contacted on.

Click on the "Discover" button. A number of addresses will be printed below the Peer ID. We will use one of these addresses when we connect to this browser peer from the other browser peer.

You can also check the relay's terminal output to see the browser peer connecting to the relay.

Now, click on "Create". A new local database called "my-db" will be created and a single record, "hello world", will be added. Also, a database address will be printed below the "Create" button. We're going to use this and the peer address in the next step.

### Launching browser B and replicating the database

Open a new browser window on the same machine, preferably using a different browser application (for example, if you used Firefox for browser A, use Brave or Chromium for browser B). Navigate to http://localhost:5173/.

We want to replicate the database created on browser A on browser B.

Go back to browser A and copy the first webrtc address. It will look something like:

`/ip4/127.0.0.1/tcp/12345/ws/p2p/12D3KooWAJjbRkp8FPF5MKgMU53aUTxWkqvDrs4zc1VMbwRwfsbE/p2p-circuit/webrtc/p2p/12D3KooWNf2oFpL9AWRsnr38XyYZ8yfS5DuKB1Zij6faduALWoz6`

Return to browser B and paste the copied webrtc address into the input box "LibP2P Address".

Again, go back to browser A and this time copy the orbitdb database address. Again, it will look something like:

`/orbitdb/zdpuAqK8m7AxmpTaHSpsCw2G7WmDnYBXvCpumbutqk1Nrj719`

Back in browser B, paste the copied database address into the "Database Address" input box.

Finally, click on the "Fetch" button. If successful, you should see the database address printed below the "Fetch" button along with the only record in the database, "hello world".

## Summary

That's it. You should have the basics of a browser-based peer-to-peer database which you can expand on.

The process described here is the only way to get two browsers to successfully connect and communicate directly via LibP2P and it is recommended you use the same configuration as defined here for any browser-to-browser communication via LibP2P.

A few takeaways from this example:

- None of the data is encrypted. It is stored in clear text. You will probably want to look at encrypting the data in a real world application,

- There is nothing keeping the connection alive. If it drops, you will need to detect the drop and manually re-establish the connection,

- In this example, you had to manually connect browser B to browser A by providing browser A's "discovered" address. There may be more elegant ways of publishing a peer's address for other peers to discover such as using [LibP2P's Pubsub Peer Discovery](https://github.com/libp2p/js-libp2p-pubsub-peer-discovery/),

- Note that you only need browser A's "discovered" address to connect from browser B. We don't need to "discover" browser B's addresses,

- You may want to move the relay address into your browser's Libp2p bootstrap configuration, especially if the relay address is hardcoded, removing the need to manually dial the relay.

## Further Reading

https://docs.libp2p.io/guides/getting-started/webrtc/
