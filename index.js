'use strict';

const { uuidV4 } = require('fast-uuidv4');

const debug = require('debug')('Timer');
debug('load');

const {
  performance,
  PerformanceObserver
} = require('perf_hooks');

const EventEmitter = require('events');

/**
 * mensure time spend in a methods or actions
 *
 * @see https://nodejs.org/docs/latest-v14.x/api/perf_hooks.html
 * @class
 */
class Timer {
  static getHandler (target, prop, receiver) {
    switch (prop) {
      case 'valueOf':
        return this.msecs;
      case 'toString':
        return this.name;
      case 'toJSON':
        return { [this.name]: this.msecs };
      case 'end':
        return () => {
          if (!this.msecs) {
            performance.measure(this.uuid, this.uuid);
          }
          return true;
        };
      default:
        return Reflect.get(...arguments);
    }
  }

  static applyHandler (fn, prop, receiver) {
    const timer = this.timer(fn.name || 'anonymous', fn.constructor.name);
    console.log(timer);
    performance.mark(timer.uuid);
    const result = Reflect.apply(...arguments);
    if (result instanceof Promise) {
      return result.then(
        (...args) => {
          timer.end();
          return args;
        }
      );
    }
    return result;
  }

  static measureCallback (list, observe) {
    const [{ duration }] = list.getEntriesByName(this.uuid, 'measure');
    this.msecs = duration.toFixed(5);
    observe.disconnect();
    debug(`stoped timer: ${JSON.stringify(this)}`);
    performance.clearMarks(this.uuid);
    Timer.emit('event', this);
  }

  static timer (name, type = 'mark') {
    debug('new timer: ' + name);

    const data = {
      name,
      type,
      uuid: uuidV4()
    };

    const observer = new PerformanceObserver(
      Timer.measureCallback.bind(data)
    );

    observer.observe({
      entryTypes: ['measure']
    });

    performance.mark(data.uuid);

    return new Proxy(data, { get: Timer.getHandler.bind(data) });
  }

  static timerify (fn) {
    if (typeof fn !== 'function') {
      throw new TypeError('Only function is allowed');
    }
    return new Proxy(fn, { apply: Timer.applyHandler.bind(this) });
  }

  static on (...args) {
    if (!Timer.instance) {
      Timer.instance = new EventEmitter();
    }
    return Timer.instance.on(...args);
  }

  static once (...args) {
    if (!Timer.instance) {
      Timer.instance = new EventEmitter();
    }
    return Timer.instance.on(...args);
  }

  static emit (...args) {
    if (!Timer.instance) {
      Timer.instance = new EventEmitter();
    }
    return Timer.instance.emit(...args);
  }
}

module.exports = {
  Timer
};