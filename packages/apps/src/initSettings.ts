// Copyright 2017-2021 @polkadot/apps authors & contributors
// SPDX-License-Identifier: Apache-2.0

import queryString from 'query-string';
import store from 'store';

import { createWsEndpoints } from '@polkadot/apps-config';
import { extractIpfsDetails } from '@polkadot/react-hooks/useIpfs';
import { settings } from '@polkadot/ui-settings';
import { assert } from '@polkadot/util';

function getApiUrl (): string {
  // we split here so that both these forms are allowed
  //  - http://localhost:3000/?rpc=wss://substrate-rpc.parity.io/#/explorer
  //  - http://localhost:3000/#/explorer?rpc=wss://substrate-rpc.parity.io
  const urlOptions = queryString.parse(location.href.split('?')[1]);

  // if specified, this takes priority
  if (urlOptions.rpc) {
    assert(!Array.isArray(urlOptions.rpc), 'Invalid WS endpoint specified');

    // https://polkadot.js.org/apps/?rpc=ws://127.0.0.1:9944#/explorer;
    const url = decodeURIComponent(urlOptions.rpc.split('#')[0]);

    assert(url.startsWith('ws://') || url.startsWith('wss://'), 'Non-prefixed ws/wss url');

    return url;
  }

  const endpoints = createWsEndpoints(<T = string>(): T => ('' as unknown as T));
  const { ipnsChain } = extractIpfsDetails();

  // check against ipns domains (could be expanded to others)
  if (ipnsChain) {
    const option = endpoints.find(({ dnslink }) => dnslink === ipnsChain);

    if (option) {
      return option.value as string;
    }
  }

  const stored = store.get('settings') as Record<string, unknown> || {};
  const fallbackUrl = endpoints.find(({ value }) => !!value);

  // via settings, or the default chain
  return [stored.apiUrl, process.env.WS_URL].includes(settings.apiUrl)
    ? settings.apiUrl // keep as-is
    : fallbackUrl
      ? fallbackUrl.value as string // grab the fallback
      : 'ws://127.0.0.1:9944'; // nothing found, go local
}

function getLightClientUrl (): string {
  // we split here so that both these forms are allowed
  //  - http://localhost:3000/?light=https://polygon-da-light.matic.today/#/explorer
  //  - http://localhost:3000/#/explorer?light=https://polygon-da-light.matic.today
  const urlOptions = queryString.parse(location.href.split('?')[1]);

  // if specified, this takes priority
  if (urlOptions.light) {
    assert(!Array.isArray(urlOptions.light), 'Invalid LC endpoint specified');

    // https://polygon-da-explorer.matic.today?light=ws://127.0.0.1:7000/v1/json-rpc#/explorer;
    const url = decodeURIComponent(urlOptions.light.split('#')[0]);

    assert(url.startsWith('http://') || url.startsWith('https://'), 'Non-prefixed http/https url');

    return url;
  }

  const stored = window.localStorage.getItem('lcUrl');

  const fallbackUrl = 'https://polygon-da-light.matic.today/v1/json-rpc';

  // via settings, or the default chain
  return (stored !== null && stored !== undefined)
    ? stored // keep as-is
    : fallbackUrl
}

const apiUrl = getApiUrl();
const lcUrl = getLightClientUrl();

// set the default as retrieved here
settings.set({ apiUrl });
window.localStorage.setItem('lcUrl', lcUrl);

console.log('WS endpoint=', apiUrl);
console.log('LC endpoint=', lcUrl);
