import { NativeModules, Platform } from 'react-native';
import GoogleApi from './googleApi';
import { Position, Bounds, GeocoderOptions, GeocodingObject } from './types';

const { RNGeocoder } = NativeModules;

let inited = false;
let apiKey: string;
let locale = 'en';
let fallbackToGoogle = false;
let forceGoogleOnIos = false;
let maxResults = 5;

function assertInited() {
  if (!inited) {
    throw new Error('The module is not initialized.');
  }
}

function assertApiKey() {
  if (!apiKey) {
    throw new Error(
      'Invalid API Key: `apiKey` is required in the init options ' +
        'for using Google Maps API.'
    );
  }
}

function assertFallbackToGoogle(err?: Error) {
  if (!fallbackToGoogle) {
    throw err ||
      new Error(
        'Missing Native Module: Please check the module linking, ' +
          'or set `fallbackToGoogle` in the init options.'
      );
  }
}

async function init(options: GeocoderOptions = {}) {
  if (inited) {
    __DEV__ &&
      console.warn('Geocoder Init: You have already initialized this module.');
  }

  if (options) {
    if (options.apiKey != null) {
      apiKey = options.apiKey;
    }
    if (options.locale != null) {
      locale = options.locale;
    }
    if (options.fallbackToGoogle != null) {
      fallbackToGoogle = options.fallbackToGoogle;
    }
    if (options.forceGoogleOnIos != null) {
      forceGoogleOnIos = options.forceGoogleOnIos;
    }
    if (options.maxResults != null) {
      maxResults = options.maxResults;
    }
  }

  if (typeof RNGeocoder === 'undefined') {
    inited = true;
    return;
  }

  await RNGeocoder.init(locale, maxResults);
  inited = true;
}

async function geocodePositionGoogle(position: Position) {
  assertInited();
  assertApiKey();
  return GoogleApi.geocodePosition(apiKey, position, locale);
}

async function geocodeAddressGoogle(address: string, bounds?: Bounds) {
  assertInited();
  assertApiKey();
  if (!bounds) {
    return GoogleApi.geocodeAddress(apiKey, address, locale);
  }
  return GoogleApi.geocodeAddressWithBounds(apiKey, address, bounds, locale);
}

async function geocodePosition(position: Position): Promise<GeocodingObject[]> {
  assertInited();
  if (!position || position.lat == null || position.lng == null) {
    throw new Error('Invalid Position: `{lat, lng}` is required');
  }

  if (forceGoogleOnIos && Platform.OS === 'ios') {
    return geocodePositionGoogle(position);
  }

  if (typeof RNGeocoder === 'undefined') {
    assertFallbackToGoogle();
    return geocodePositionGoogle(position);
  }

  try {
    return RNGeocoder.geocodePosition(position);
  } catch (err) {
    assertFallbackToGoogle(err);
    return geocodePositionGoogle(position);
  }
}

async function geocodeAddress(
  address: string,
  bounds?: Bounds
): Promise<GeocodingObject[]> {
  assertInited();
  if (!address) {
    throw new Error('Invalid Address: `string` is required');
  }

  if (forceGoogleOnIos && Platform.OS === 'ios') {
    return geocodeAddressGoogle(address);
  }

  if (typeof RNGeocoder === 'undefined') {
    assertFallbackToGoogle();
    return geocodeAddressGoogle(address);
  }

  try {
    if (!bounds) {
      return await RNGeocoder.geocodeAddress(address);
    }
    const { sw, ne } = bounds;
    return await RNGeocoder.geocodeAddressWithBounds(
      address,
      sw.lat,
      sw.lng,
      ne.lat,
      ne.lng
    );
  } catch (err) {
    assertFallbackToGoogle(err);
    return geocodeAddressGoogle(address);
  }
}

export default {
  init,
  geocodePosition,
  geocodePositionGoogle,
  geocodeAddress,
  geocodeAddressGoogle,
};