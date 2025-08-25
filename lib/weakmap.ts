interface WeakMapEntry<K extends object, V> {
  value: V;
  ref: WeakRef<K>;
}

/**
 * WeakMap that is iterable.
 */
export class IterableWeakMap<K extends object, V> {
  #weakMap = new WeakMap<K, WeakMapEntry<K, V>>();
  #refSet = new Set<WeakRef<K>>();
  #finalizationGroup = new FinalizationRegistry(IterableWeakMap.#cleanup);

  static #cleanup(heldValue: {
    set: Set<WeakRef<any>>;
    ref: WeakRef<any>;
  }): void {
    heldValue.set.delete(heldValue.ref);
  }

  constructor(iterable?: Iterable<[K, V]>) {
    if (iterable) {
      for (const [key, value] of iterable) {
        this.set(key, value);
      }
    }
  }

  set(key: K, value: V): this {
    const ref = new WeakRef(key);

    this.#weakMap.set(key, { value, ref });
    this.#refSet.add(ref);
    this.#finalizationGroup.register(
      key,
      {
        set: this.#refSet,
        ref,
      },
      ref,
    );

    return this;
  }

  get(key: K): V | undefined {
    const entry = this.#weakMap.get(key);
    return entry?.value;
  }

  delete(key: K): boolean {
    const entry = this.#weakMap.get(key);
    if (!entry) {
      return false;
    }

    this.#weakMap.delete(key);
    this.#refSet.delete(entry.ref);
    this.#finalizationGroup.unregister(entry.ref);
    return true;
  }

  *[Symbol.iterator](): IterableIterator<[K, V]> {
    for (const ref of this.#refSet) {
      const key = ref.deref();
      if (!key) continue;
      const entry = this.#weakMap.get(key);
      if (entry) {
        yield [key, entry.value];
      }
    }
  }

  entries(): IterableIterator<[K, V]> {
    return this[Symbol.iterator]();
  }

  *keys(): IterableIterator<K> {
    for (const [key] of this) {
      yield key;
    }
  }

  *values(): IterableIterator<V> {
    for (const [, value] of this) {
      yield value;
    }
  }

  forEach(callback: (value: V, key: K, map: this) => void, thisArg?: any): void {
    for (const [key, value] of this) {
      callback.call(thisArg, value, key, this);
    }
  }
}
