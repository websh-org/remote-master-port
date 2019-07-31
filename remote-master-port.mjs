export class RemoteMasterPort {
  static async connect(...args) {
    const it = new this(...args);
    await it.connect();
    return it;
  }
  constructor(id, iframe, origin="*") {
    this.id = id;
    this.iframe = iframe;
    this.origin = origin;
    this.connected = false;
    this.active = true;
    this._handlers = {};
    this._pending = {};
  }

  connect() {
    this.channel = new MessageChannel();
    this.port = this.channel.port1;
    return new Promise((resolve, reject) => {
      
      const timeout = setTimeout(
        ()=>reject(new Error("connect-timeout"))
        ,5000
      );

      this.iframe.contentWindow.postMessage({ [this.id]: "connect", "version": "1.0.0", port: this.channel.port2 }, this.origin, [this.channel.port2]);
      this.port.onmessage = ev => {
        try {
          if (!ev.data || ev.data[this.id] !== "connected") return this._deactivate();
          this.manifest = ev.data.manifest || {}
          this.connected = true;
          this.port.onmessage = ev => {
            this._receive(ev.data || {});
          };
          resolve();
        } catch (err) {
          reject(err);
        }
      };
    });
  }
  on(event,handler) {
    this._handlers[event]=handler;
  }
  request(api, cmd, args = {}, transfer = []) {
    if (!this.connected) return;
    const rsvp = Math.random().toString(36).substr(2);
    const promise = new Promise((resolve, reject) => {
      this._pending[rsvp] = { resolve, reject };
    });
    this._send({ api, cmd, args, rsvp }, transfer);
    return promise;
  }
  send(api, cmd, args = [], transfer = []) {
    if (!this.connected) return;
    this._send({ api, cmd, args }, transfer);
  }
  _send(msg, transfer = []) {
    if (!this.connected) return;
    this.port.postMessage(msg, transfer);
  }
  _receive({ event, data, re, result, error }) {
    if (re) {
      const pending = this._pending[re];
      if (!pending) return;
      delete this._pending[re];
      if (error) return pending.reject(error);
      return pending.resolve(result);
    } 
    if (event) {
      const handler = this._handlers[event];
      if (!handler) return;
      handler(data);
    }
  }
  _deactivate() {
    this.connected = false;
    this.active = false;
  }
}