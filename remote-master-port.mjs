export class RemoteMasterPort {
  static async connect(...args) {
    const it = new this(...args);
    await it.connect();
    return it;
  }
  constructor(id, iframe, { origin = "*", debug = false }) {
    this.id = id;
    this.iframe = iframe;
    this.origin = origin;
    this.debug = debug;
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
        () => reject(new Error("port-connect-timeout"))
        , 5000
      );

      this.iframe.contentWindow.postMessage({ [this.id]: "connect", "version": "1.0.0", port: this.channel.port2 }, this.origin, [this.channel.port2]);
      this.port.onmessage = ev => {
        try {
          if (!ev.data || ev.data[this.id] !== "connected") return this._deactivate();
          clearTimeout(timeout);
          const manifest = ev.data.manifest || {}
          this.connected = true;
          this.port.onmessage = ev => {
            this._receive(ev.data || {});
          };
          resolve(manifest);
        } catch (err) {
          reject(err);
        }
      };
    });
  }
  disconnect() {
    this.send('port-disconnect');
    this._deactivate();
  }
  on(event, handler) {
    this._handlers[event] = handler;
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
    const pending = this._pending[re];
    if (!pending) return;
    delete this._pending[re];
    if (error) {
      return pending.reject({ error, data });
    }
    if (event) {
      const handler = this._handlers[event];
      if (!handler) return;
      handler(data);
    }
    return pending.resolve(result);
  }
  _deactivate() {
    this.connected = false;
    this.active = false;
  }
}