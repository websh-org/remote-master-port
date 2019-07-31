# remote-master-port
Master port for async cross-iframe messaging. Load this in the top window.

See [remote-slave-port](https://github.com/websh-org/remote-slave-port) for the other side of the channel (in the iframe).

The master port must innitiate the connection. 


## Synopsis
````bash
$ npm install @websh/remote-master-port
````

````js
import { RemoteMasterPort } from "@websh/remote-slave-port";

// the slave port in a child iframe must use 
// the same channelId to establish a channel
const channelId = "my-channel"; 
const myIframe = document.getElementById('my-iframe')
const myMasterPort = new RemoteMasterPort(channelId,myIframe);
````

## Methods

All methods return the MasterSlavePort object, so you can chain method calls.

### `async connect()`
Connect to the iframe. Returns the slave port's manifest or throws an error if connection has failed.

### `send( String command, Object args )`
Send a command to the slave port, ignore any results.

### `async request( String command, Object args )`
Send a command to the slave port, and wait for the result.

### `.on( String event, Object data )`
Handle an event sent by the slave port.
