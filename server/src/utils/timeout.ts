import { setTimeout as sleep } from 'node:timers/promises';

/** Erreur levée quand une opération dépasse son délai. */
export class TimeoutError extends Error {
  /** @param ms Délai dépassé, en millisecondes. */
  constructor(ms: number) {
    super(`Délai dépassé (${ms} ms)`);
    this.name = 'TimeoutError';
  }
}

/**
 * Attend une promesse au plus `ms` millisecondes.
 * Note : l'opération sous-jacente n'est pas annulée, seule l'attente l'est.
 * @param promise Opération à attendre.
 * @param ms Délai maximal en millisecondes.
 * @returns Le résultat de l'opération.
 * @throws TimeoutError si le délai est dépassé.
 */
export async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const timeout = sleep(ms, undefined, { signal: controller.signal }).then((): never => {
    throw new TimeoutError(ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    controller.abort();
  }
}
