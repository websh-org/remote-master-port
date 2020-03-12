export class RemoteMasterPort {
  static async connect(...args) {
    const it = new this(...args);
    await it.connect();
    return it;
  }
  constructor(id, iframe, { origin = "*", debug = false, handler }) {
    this.id = id;
    this.iframe = iframe;
    this.origin = origin;
    this.debug = debug;
    this.connected = false;
    this.active = true;
    this.handler = handler || (()=>{});
    this._pending = {};
  }

  connect(data={}) {
    this.channel = new MessageChannel();
    this.port = this.channel.port1;
    return new Promise((resolve, reject) => {

      const timeout = setTimeout(
        () => reject(new Error("port-connect-timeout"))
        , 5000
      );

      this.iframe.contentWindow.postMessage({ 
        [this.id]: "connect", 
        version: "1.0.0", 
        port: this.channel.port2,
        data
      }, this.origin, [this.channel.port2]);
      this.port.onmessage = async ev => {
        try {
          clearTimeout(timeout);
          const {data} = ev;
          switch (data && data[this.id]) {
            case "rejected":
              console.error(data.error);
              throw new Error("port-connect-rejected");
            case "connected":
              this.connected = true;
              this.port.onmessage = e => this._receive(e.data || {});
              return resolve(data.manifest||{});
            default:
              throw new Error("port-connect-badresponse");
          }
        } catch (error) {
          this._deactivate();
          reject(error);
        }
      };
    });
  }
  disconnect() {
    this.send('port-disconnect');
    this._deactivate();
  }
 
  request(cmd, args = {}, {transfer=[],timeout=10000} = []) {
    if (!this.connected) throw new Error("port-not-connected");
    const rsvp = Math.random().toString(36).substr(2);
    const promise = new Promise((resolve, reject) => {
      this._pending[rsvp] = { resolve, reject };
    });
    this._send({ cmd, args, rsvp }, transfer);
    return promise;
  }
  send(cmd, args = [], transfer = []) {
    if (!this.connected) throw new Error("port-not-connected");
    this._send({ cmd, args }, transfer);
  }
  _send(msg, transfer = []) {
    if (!this.connected) throw new Error("port-not-connected");
    this.port.postMessage(msg, transfer);
  }
  _receive({ event, data, re, result, error, message = error }) {
    if (event) {
      console.log('event',event,data)
      return this.handler(event,data);
    }
    console.log('received',{ event, data, re, result, error })
    const pending = this._pending[re];
    if (!pending) return;
    delete this._pending[re];
    if (error) {
      return pending.reject({ error, data });
    }
    return pending.resolve(result);
  }
  _deactivate() {
    this.connected = false;
    this.active = false;
  }
}