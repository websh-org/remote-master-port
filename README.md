# remote-master-port
Master port for async cross-site messaging

````js
const { RemoteMasterPort } = require("@websh/remote-master-port");

const iframe = document.getElementById("my-iframe");
const childFrame = new RemoteMasterPort(iframe);

await childFrame.load(url);
console.log(await childFrame.send('ping'));
console.log(await childFrame.send('echo',{foo:'bar'}));
````

