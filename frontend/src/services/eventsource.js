class EventStream {
  constructor() {
    this.source = null;
    this.listeners = new Set();
    this.statusListeners = new Set();
    this.status = 'disconnected';
  }

  connect() {
    if (this.source) return;
    this._notifyStatus('connecting');

    try {
      const source = new EventSource('/api/events/stream');
      this.source = source;

      source.onopen = () => {
        if (this.source !== source) return;
        this._notifyStatus('connected');
      };

      source.onmessage = (event) => {
        if (this.source !== source) return;
        try {
          this._notifyMessage(JSON.parse(event.data));
        } catch (error) {
          console.error('Failed to parse SSE event payload:', error);
        }
      };

      source.onerror = () => {
        if (this.source !== source) return;
        const closed = source.readyState === EventSource.CLOSED;
        if (closed) this.source = null;
        this._notifyStatus(closed ? 'disconnected' : 'connecting');
      };
    } catch (error) {
      this.source = null;
      this._notifyStatus('disconnected');
      console.error('Could not create the SSE connection:', error);
    }
  }

  close() {
    if (this.source) {
      this.source.close();
      this.source = null;
    }
    this._notifyStatus('disconnected');
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  subscribeStatus(callback) {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => this.statusListeners.delete(callback);
  }

  _notifyMessage(message) {
    for (const listener of this.listeners) {
      try {
        listener(message);
      } catch (error) {
        console.error('Error in SSE event subscriber:', error);
      }
    }
  }

  _notifyStatus(status) {
    if (this.status === status) return;
    this.status = status;
    for (const listener of this.statusListeners) {
      try {
        listener(status);
      } catch (error) {
        console.error('Error in SSE status subscriber:', error);
      }
    }
  }
}

export const eventStream = new EventStream();
